"""La gravite locale suit les faces externes, jamais les cavites du taquin."""
from dataclasses import replace
import unittest

try:
    from .engine import GameError
    from .lunar import FACES, FINISH, LunarTile, LunarGame, LUNAR_LEVELS, is_exterior, surface_index, surface_parts, surface_neighbor, surface_paths
except ImportError:
    from engine import GameError
    from lunar import FACES, FINISH, LunarTile, LunarGame, LUNAR_LEVELS, is_exterior, surface_index, surface_parts, surface_neighbor, surface_paths


class LunarGeometryTests(unittest.TestCase):
    def test_exactly_fifty_four_external_patches_with_four_reciprocal_neighbors(self):
        patches = [index for index in range(FINISH) if is_exterior(index)]
        self.assertEqual(len(patches), 54)
        for index in patches:
            neighbors = [(side, surface_neighbor(index, side)) for side in FACES]
            neighbors = [(side, neighbor) for side, neighbor in neighbors if neighbor]
            self.assertEqual(len(neighbors), 4)
            for side, (destination, return_side) in neighbors:
                self.assertTrue(is_exterior(destination))
                self.assertEqual(surface_neighbor(destination, return_side), (index, side))

    def test_edges_change_face_without_crossing_the_solid(self):
        top = surface_index(18, "U")
        self.assertEqual(surface_neighbor(top, "W"), (surface_index(18, "W"), "U"))
        bottom = surface_index(0, "D")
        self.assertEqual(surface_neighbor(bottom, "N"), (surface_index(0, "N"), "D"))
        self.assertIsNone(surface_neighbor(top, "D"))

    def test_core_and_inward_faces_are_never_walkable_even_beside_a_hole(self):
        for face in FACES:
            self.assertFalse(is_exterior(surface_index(13, face)))
        self.assertFalse(is_exterior(surface_index(22, "D")))
        self.assertIsNone(surface_neighbor(surface_index(22, "D"), "N"))

    def test_a_route_can_reach_the_underside_but_stops_at_a_missing_cube(self):
        tiles = [None] * 27
        tiles[18] = LunarTile("top", (), faces=(("U", ("I", "W")), ("W", ("U", "D"))))
        tiles[9] = LunarTile("side", (), faces=(("W", ("U", "D")),))
        tiles[0] = LunarTile("bottom", (), faces=(("W", ("U", "D")), ("D", ("W", "O"))))
        entry, exit = surface_index(18, "U"), surface_index(0, "D")
        route = surface_paths(tuple(tiles), -1, entry, exit)[FINISH]
        self.assertEqual(route, [-1, entry, surface_index(18, "W"), surface_index(9, "W"),
                                 surface_index(0, "W"), exit, FINISH])
        tiles[9] = None
        self.assertNotIn(FINISH, surface_paths(tuple(tiles), -1, entry, exit))


class LunarGameTests(unittest.TestCase):
    def test_entry_accepts_any_surface_path_and_allows_return_without_a_hidden_marker(self):
        for level in LUNAR_LEVELS:
            with self.subTest(level=level.id):
                game = LunarGame(level.id)
                for action in level.solution[:-1]:
                    game.act(*action)
                entry_cube, _ = surface_parts(level.entry_surface)
                tiles = list(game.tiles)
                tile = tiles[entry_cube]
                tiles[entry_cube] = replace(tile, id="another-lunar-cube", faces=tuple(
                    (face, tuple(port for port in ports if port != "I")) for face, ports in tile.faces))
                game.tiles = tuple(tiles)
                available = game.state()
                self.assertTrue(available["canEnter"])
                self.assertEqual(available["walkRoutes"][str(level.entry_surface)], [-1, level.entry_surface])
                arrived = game.act("walk")
                self.assertEqual(arrived["hero"], level.entry_surface)
                self.assertEqual(arrived["walkPath"], [-1, level.entry_surface])
                self.assertEqual(arrived["walkRoutes"]["-1"], [level.entry_surface, -1])
                returned = game.act("walk", -1)
                self.assertEqual(returned["hero"], -1)
                self.assertTrue(returned["canEnter"])
                self.assertEqual(game.act("undo")["walkPath"], [-1, level.entry_surface])

    def test_entry_requires_a_present_cube_with_a_path_on_the_landing_face(self):
        for missing_cube in (False, True):
            with self.subTest(missing_cube=missing_cube):
                game = LunarGame()
                for action in game.level.solution[:-1]:
                    game.act(*action)
                entry_cube, entry_face = surface_parts(game.level.entry_surface)
                tiles = list(game.tiles)
                tile = tiles[entry_cube]
                tiles[entry_cube] = None if missing_cube else replace(tile, faces=tuple(
                    (face, () if face == entry_face else ports) for face, ports in tile.faces))
                game.tiles = tuple(tiles)
                before = game.state()
                self.assertFalse(before["canEnter"])
                self.assertEqual(before["walkRoutes"], {})
                for destination in (None, game.level.entry_surface):
                    with self.assertRaises(GameError):
                        game.act("walk", destination)
                    self.assertEqual(game.state(), before)

    def test_last_level_exit_accepts_any_connected_cube_without_a_hidden_marker(self):
        game = LunarGame("selenite")
        for action in game.level.solution[:-1]:
            game.act(*action)
        exit_cube, _ = surface_parts(game.level.exit_surface)
        tiles = list(game.tiles)
        tile = tiles[exit_cube]
        tiles[exit_cube] = replace(tile, id="another-lunar-cube", faces=tuple(
            (face, tuple(port for port in ports if port != "O")) for face, ports in tile.faces))
        game.tiles = tuple(tiles)
        arrived = game.act("walk", game.level.exit_surface)
        self.assertEqual(arrived["hero"], arrived["exit"]["index"])
        self.assertFalse(arrived["won"])
        self.assertTrue(arrived["canExit"])
        self.assertEqual(arrived["walkRoutes"][str(FINISH)], [game.level.exit_surface, FINISH])
        self.assertTrue(game.act("walk", FINISH)["won"])

    def test_the_occupied_cube_is_pinned_whichever_face_lumen_stands_on(self):
        game = LunarGame()
        for action in game.level.solution[:-1]:
            game.act(*action)
        game.act("walk", game.level.entry_surface)
        game.act("slide", 22, 13)
        game.act("slide", 21, 22)
        before = game.state()
        self.assertEqual(before["heroCube"], 18)
        self.assertNotIn({"index": 18, "to": 21}, before["slideOptions"])
        with self.assertRaises(GameError):
            game.act("slide", 18, 21)
        self.assertEqual(game.state(), before)

    def test_invalid_or_internal_surface_destinations_leave_the_game_unchanged(self):
        game = LunarGame()
        before = game.state()
        for destination in (True, 1.0, "112", -2, FINISH + 1, surface_index(13, "U"), surface_index(22, "D")):
            with self.subTest(destination=destination):
                with self.assertRaises(GameError):
                    game.act("walk", destination)
                self.assertEqual(game.state(), before)

    def test_five_new_levels_are_solvable_without_entering_the_volume(self):
        self.assertEqual(len(LUNAR_LEVELS), 5)
        self.assertEqual([level.chapter for level in LUNAR_LEVELS], [35, 36, 37, 38, 39])
        for level in LUNAR_LEVELS:
            with self.subTest(level=level.id):
                game = LunarGame(level.id)
                self.assertFalse(game.state()["canExit"])
                self.assertEqual(len(game.tiles), 27)
                self.assertEqual(sum(tile is None for tile in game.tiles), 1)
                for action in level.solution:
                    game.act(*action)
                state = game.state()
                self.assertTrue(state["won"])
                self.assertEqual(state["moves"], level.par)
                self.assertEqual(state["steps"], level.stepPar)
                self.assertTrue(all(is_exterior(index) for index in state["walkPath"][1:-1]))
                self.assertIn("D", {surface_parts(index)[1] for index in state["walkPath"][1:-1]})
                self.assertEqual(state["slideOptions"], [])

    def test_hints_reach_the_lunar_exit_and_preserve_the_current_state(self):
        for level in LUNAR_LEVELS:
            game = LunarGame(level.id)
            for _ in range(level.par + 3):
                if game.state()["won"]:
                    break
                before = (game.tiles, game.hero, game.moves, game.steps)
                hint = game.act("hint")["hint"]
                self.assertEqual((game.tiles, game.hero, game.moves, game.steps), before)
                self.assertIsNotNone(hint, level.id)
                game.act(hint["type"], hint["index"], hint.get("to"))
            self.assertTrue(game.state()["won"], level.id)

    def test_relic_detour_is_optional_and_undo_retraces_faces(self):
        for level in LUNAR_LEVELS:
            game = LunarGame(level.id)
            initial = game.state()
            for action in level.solution[:-1]:
                game.act(*action)
            state = game.act("walk", level.relic)
            self.assertTrue(state["relic"]["taken"])
            self.assertEqual(game.act("undo")["walkPath"], list(reversed(state["walkPath"])))
            self.assertFalse(game.state()["relic"]["taken"])
            self.assertTrue(game.act("walk", FINISH)["won"])
            self.assertFalse(game.state()["relic"]["taken"])
            self.assertEqual(game.act("reset"), initial)


if __name__ == "__main__":
    unittest.main()
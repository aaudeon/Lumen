"""Regles du taquin spatial, independantes du rendu 3D."""
import unittest

try:
    from .engine import GameError, Tile
    from .space import SpaceGame, SPACE_LEVELS, FINISH, cube_coordinates, cube_neighbors, cube_slide_options, volume_paths
except ImportError:
    from engine import GameError, Tile
    from space import SpaceGame, SPACE_LEVELS, FINISH, cube_coordinates, cube_neighbors, cube_slide_options, volume_paths


class VolumeGeometryTests(unittest.TestCase):
    def test_center_has_six_neighbors_and_corner_has_three(self):
        self.assertEqual(dict(cube_neighbors(13)), {"N": 10, "E": 14, "S": 16, "W": 12, "U": 22, "D": 4})
        self.assertEqual(dict(cube_neighbors(0)), {"E": 1, "S": 3, "U": 9})
        self.assertEqual(cube_coordinates(26), (2, 2, 2))

    def test_rows_and_layers_do_not_wrap(self):
        self.assertNotIn(3, dict(cube_neighbors(2)).values())
        self.assertNotIn(9, dict(cube_neighbors(8)).values())
        self.assertNotIn("U", dict(cube_neighbors(26)))

    def test_vertical_tunnels_require_reciprocal_openings(self):
        tiles = [None] * 27
        tiles[0] = Tile("entry", ("W", "U"))
        tiles[9] = Tile("middle", ("D", "U"))
        tiles[18] = Tile("top", ("D", "E"))
        self.assertEqual(volume_paths(tuple(tiles), -1)[18], [-1, 0, 9, 18])
        tiles[9] = Tile("middle", ("U",))
        self.assertNotIn(9, volume_paths(tuple(tiles), -1))

    def test_cubes_slide_on_all_axes_but_never_carry_the_hero(self):
        tiles = [Tile(str(index), ("E", "W")) for index in range(27)]
        tiles[13] = None
        self.assertEqual(cube_slide_options(tuple(tiles), -1), [(4, 13), (10, 13), (12, 13), (14, 13), (16, 13), (22, 13)])
        self.assertNotIn((22, 13), cube_slide_options(tuple(tiles), 22))


class SpaceGameTests(unittest.TestCase):
    def test_real_slides_work_on_six_sides_and_restore_cube_identities(self):
        for source in (4, 10, 12, 14, 16, 22):
            with self.subTest(source=source):
                game = SpaceGame()
                before = game.state()
                identity = game.tiles[source].id
                state = game.act("slide", source, 13)
                self.assertEqual(state["tiles"][13]["id"], identity)
                self.assertEqual(state["emptyCells"], [source])
                self.assertEqual(state["hero"], -1)
                restored = game.act("undo")
                for key in ("tiles", "hero", "moves", "steps", "emptyCells"):
                    self.assertEqual(restored[key], before[key])

    def test_occupied_cube_and_invalid_indices_are_rejected_without_mutation(self):
        game = SpaceGame()
        game.act("slide", 14, 13)
        game.act("walk", 13)
        before = game.state()
        for action, index, target in (("slide", 13, 14), ("slide", True, None),
                                      ("slide", 27, None), ("slide", 22, 27),
                                      ("walk", -2, None), ("walk", 28, None),
                                      ("walk", 10.0, None), ("walk", "10", None)):
            with self.subTest(action=action, index=index):
                with self.assertRaises(GameError):
                    game.act(action, index, target)
                self.assertEqual(game.state(), before)

    def test_five_unique_cubes_have_demonstrated_solutions_on_three_axes(self):
        self.assertEqual(len(SPACE_LEVELS), 5)
        layouts = set()
        for level in SPACE_LEVELS:
            with self.subTest(level=level.id):
                game = SpaceGame(level.id)
                self.assertFalse(game.state()["canExit"])
                self.assertEqual(len(game.tiles), 27)
                self.assertEqual(sum(tile is None for tile in game.tiles), 1)
                layouts.add(tuple(tile.ports if tile else None for tile in game.tiles))
                for action in level.solution:
                    game.act(*action)
                state = game.state()
                self.assertTrue(state["won"])
                self.assertEqual(state["hero"], FINISH)
                self.assertEqual(state["moves"], level.par)
                self.assertEqual(state["steps"], level.stepPar)
                self.assertEqual(state["slideOptions"], [])
                self.assertEqual({cube_coordinates(index)[1] for index in state["walkPath"][1:-1]}, {0, 1, 2})
        self.assertEqual(len(layouts), 5)

    def test_undo_retraces_vertical_walk_and_reset_restores_the_volume(self):
        game = SpaceGame()
        initial = game.state()
        for action in game.level.solution[:-1]:
            game.act(*action)
        state = game.act("walk", 22)
        self.assertIn(13, state["walkPath"])
        route = state["walkPath"]
        self.assertEqual(game.act("undo")["walkPath"], list(reversed(route)))
        self.assertEqual(game.act("reset"), initial)

    def test_hints_reach_the_exit_without_changing_state_in_advance(self):
        for level in SPACE_LEVELS:
            game = SpaceGame(level.id)
            for _ in range(level.par + 3):
                if game.state()["won"]:
                    break
                before = (game.tiles, game.hero, game.moves, game.steps)
                hint = game.act("hint")["hint"]
                self.assertEqual((game.tiles, game.hero, game.moves, game.steps), before)
                self.assertIsNotNone(hint)
                game.act(hint["type"], hint["index"], hint.get("to"))
            self.assertTrue(game.state()["won"], level.id)

    def test_relic_is_optional_and_collectible_before_leaving(self):
        for level in SPACE_LEVELS:
            game = SpaceGame(level.id)
            for action in level.solution[:-1]:
                game.act(*action)
            self.assertFalse(game.state()["relic"]["taken"])
            self.assertTrue(game.act("walk", level.relic)["relic"]["taken"])
            self.assertTrue(game.act("walk", FINISH)["won"])


if __name__ == "__main__":
    unittest.main()
"""Run: python -m unittest discover -s backend -v"""
from dataclasses import replace
import http.client
import json
from pathlib import Path
import random
import re
import tempfile
import threading
import unittest

try:
    from .engine import Game, GameError, LEVELS, SECRET_LEVELS, SECRET_SPURS, LEVEL_BY_ID, FINISH, OUTSIDE, paths_from, solve_plan, Tile, make_tiles, apply_plan, start_board, neighbors
    from .server import GameServer, CAMPAIGN_LEVELS
    from .space import SPACE_LEVELS
    from .lunar import LUNAR_LEVELS
except ImportError:
    from engine import Game, GameError, LEVELS, SECRET_LEVELS, SECRET_SPURS, LEVEL_BY_ID, FINISH, OUTSIDE, paths_from, solve_plan, Tile, make_tiles, apply_plan, start_board, neighbors
    from server import GameServer, CAMPAIGN_LEVELS
    from space import SPACE_LEVELS
    from lunar import LUNAR_LEVELS


class RulesTests(unittest.TestCase):
    def test_all_curated_solutions_really_win(self):
        for level in LEVELS:
            with self.subTest(level=level.id):
                game = Game(level.id)
                self.assertFalse(game.state()["canExit"])
                for action in level.solution:
                    game.act(*action)
                    self.assertIn(game.hero, [OUTSIDE, FINISH] +
                                  [i for i, tile in enumerate(game.tiles) if tile])
                self.assertTrue(game.state()["won"])
                self.assertEqual(game.moves, level.par)
                self.assertEqual(game.state()["slidable"], [])

    def test_step_par_matches_the_authored_solution(self):
        # The client scores a run against these two references, so both must be real.
        for level in LEVELS:
            with self.subTest(level=level.id):
                game = Game(level.id)
                for action in level.solution:
                    game.act(*action)
                self.assertEqual(game.steps, level.stepPar)
                self.assertEqual(game.moves, level.par)
                self.assertGreater(level.stepPar, 0)
                self.assertEqual(level.public()["stepPar"], level.stepPar)

    def test_every_difficulty_label_has_a_client_score_rate(self):
        # An unlisted label would silently score a hard passage like an easy one.
        source = (Path(__file__).resolve().parent.parent / "src" / "score.js").read_text(encoding="utf-8")
        table = source.split("export const RATES = {")[1].split("};")[0]
        rates = {name: float(value) for name, value
                 in re.findall(r"'?([^\s',:]+)'?\s*:\s*([\d.]+)", table)}
        for level in LEVELS + SECRET_LEVELS:
            with self.subTest(level=level.id):
                self.assertIn(level.difficulty, rates)
                self.assertGreaterEqual(rates[level.difficulty], 1)

    def test_campaign_numbers_every_world_and_keeps_puzzles_distinct(self):
        self.assertEqual(len({level.id for level in LEVELS}), len(LEVELS))
        shapes = {tuple(None if tile is None else (tuple(sorted(tile.ports)), tile.hazard, tile.flow)
                        for tile in level.tiles) for level in LEVELS}
        self.assertEqual(len(shapes), len(LEVELS))
        self.assertEqual([level.chapter for level in LEVELS], list(range(1, len(LEVELS) + 1)))
        order = [level.biome for level in LEVELS]
        self.assertEqual(order, sorted(order, key=["jungle", "atlantis", "volcano", "boreal"].index))
        for biome in ("jungle", "atlantis", "volcano", "boreal"):
            levels = [level for level in LEVELS if level.biome == biome]
            self.assertGreaterEqual(len(levels), 5)
            self.assertEqual([level.biomeLevel for level in levels],
                             list(range(1, len(levels) + 1)))
            # The five original passages still form a rising ladder of par.
            self.assertTrue(all(a.par < b.par for a, b in zip(levels[:5], levels[1:5])))
            for level in levels:
                self.assertEqual(Game(level.id).state()["biome"], biome)
                self.assertEqual(level.public()["biomeLevel"], level.biomeLevel)
                self.assertEqual(level.public()["chapter"], level.chapter)

    def test_every_level_has_a_board_profile_in_the_client(self):
        # Without an entry here a level silently borrows the jungle architecture,
        # its stone textures and its scenery, whatever biome the server reports.
        source = (Path(__file__).resolve().parent.parent / "src" / "boards.js").read_text(encoding="utf-8")
        table = source.split("const profiles = {")[1].split("};")[0]
        profiles = dict(re.findall(r"^\s*(\w+): \['(\w+)'", table, re.M))
        for level in LEVELS:
            with self.subTest(level=level.id):
                self.assertIn(level.id, profiles)
                self.assertEqual(profiles[level.id], level.biome)

    def test_fifth_level_cannot_have_static_complete_path(self):
        level = LEVELS[4]
        self.assertEqual(level.id, "relais")
        # A relic spur adds a one-port dead end, which no corridor can reuse.
        self.assertEqual(sum(bool(t and len(t.ports) > 1) for t in level.tiles), 6)
        # Entry 0 to exit 15 requires >= 3 + 3 edges = 7 cells.
        self.assertLess(sum(bool(t and len(t.ports) > 1) for t in level.tiles), 7)

    def test_hero_tile_is_locked_and_rejection_is_atomic(self):
        game = Game("relais")
        game.act("walk", 1)
        before = game.state()
        self.assertNotIn(1, before["slidable"])
        with self.assertRaisesRegex(GameError, "porte Lumen"):
            game.act("slide", 1)
        self.assertEqual(before, game.state())

    def test_walk_requires_reciprocal_contiguous_paths(self):
        game = Game("aube")
        game.act("walk", 2)
        self.assertEqual(game.state()["walkPath"], [-1, 0, 1, 2])
        self.assertEqual(game.steps, 3)
        before = game.state()
        for target in [6, 10, 15, FINISH]:
            with self.assertRaises(GameError):
                game.act("walk", target)
            self.assertEqual(before, game.state())
        game.act("walk", OUTSIDE)
        self.assertEqual(game.state()["walkPath"], [2, 1, 0, -1])
        self.assertEqual(game.steps, 6)

    def test_default_advance_enters_walks_and_exits(self):
        game = Game("aube")
        game.act("slide", 10)
        game.act("slide", 14)
        sequence = []
        for _ in range(8):
            sequence.append(game.act("walk")["hero"])
        self.assertEqual(sequence, [0, 1, 2, 6, 10, 11, 15, 16])
        self.assertTrue(game.state()["won"])

    def test_blocked_advance_does_not_bounce_back(self):
        game = Game("aube")
        for _ in range(3):
            game.act("walk")
        with self.assertRaises(GameError):
            game.act("walk")
        self.assertEqual(game.hero, 2)
        game.act("walk", 1)
        self.assertEqual(game.hero, 1)

    def test_undo_and_reset_restore_counters_and_hero(self):
        game = Game("relais")
        initial = game.state()
        game.act("walk", 5)
        after_walk = game.state()
        game.act("slide", 1)
        game.act("undo")
        for key in ["tiles", "hero", "moves", "steps", "historyLength"]:
            self.assertEqual(game.state()[key], after_walk[key])
        game.act("undo")
        for key in ["tiles", "hero", "moves", "steps", "historyLength"]:
            self.assertEqual(game.state()[key], initial[key])
        game.act("walk", 5)
        game.act("reset")
        self.assertEqual(game.state(), initial)

    def test_undo_from_victory(self):
        game = Game("aube")
        for action in game.level.solution:
            game.act(*action)
        self.assertEqual(game.steps, 8)
        state = game.act("undo")
        self.assertFalse(state["won"])
        self.assertEqual(state["walkPath"], [16, 15, 11, 10, 6, 2, 1, 0, -1])
        self.assertEqual(game.hero, OUTSIDE)
        self.assertEqual(game.moves, 2)
        self.assertEqual(game.steps, 0)
        self.assertEqual(state["historyLength"], 2)
        self.assertTrue(state["canExit"])

    def test_undo_multicell_walk_retraces_turns_even_after_hint(self):
        game = Game("relais")
        self.assertEqual(game.act("walk", 5)["walkPath"], [-1, 0, 1, 5])
        self.assertNotIn("walkPath", game.act("hint"))
        state = game.act("undo")
        self.assertEqual(state["walkPath"], [5, 1, 0, -1])
        self.assertEqual(state["hero"], OUTSIDE)
        self.assertEqual(state["steps"], 0)
        self.assertEqual(state["historyLength"], 0)

    def test_undo_each_walk_uses_its_own_route(self):
        game = Game("relais")
        game.act("walk", 5)
        game.act("walk", 0)
        state = game.act("undo")
        self.assertEqual(state["walkPath"], [0, 1, 5])
        self.assertEqual(state["steps"], 3)
        self.assertEqual(game.previous_hero, 1)
        self.assertEqual(game.act("undo")["walkPath"], [5, 1, 0, -1])

    def test_undo_slide_has_no_hero_route_and_preserves_earlier_walk(self):
        game = Game("relais")
        game.act("walk", 5)
        after_walk = game.state()
        game.act("slide", 1)
        state = game.act("undo")
        self.assertNotIn("walkPath", state)
        for key in ["tiles", "hero", "moves", "steps", "historyLength"]:
            self.assertEqual(state[key], after_walk[key])
        self.assertEqual(game.act("undo")["walkPath"], [5, 1, 0, -1])

    def test_reset_clears_walk_route_and_history(self):
        game = Game("relais")
        game.act("walk", 5)
        state = game.act("reset")
        self.assertNotIn("walkPath", state)
        self.assertEqual(state["hero"], OUTSIDE)
        self.assertEqual(state["steps"], 0)
        self.assertEqual(state["historyLength"], 0)

    def test_malformed_actions_do_not_change_state(self):
        game = Game()
        for kind, index in [("slide", True), ("slide", -1), ("slide", 16),
                            ("slide", 1.0), ("slide", "10"), ("slide", None),
                            ("slide", 6), ("walk", False), ("walk", 16.0),
                            ("walk", -2), ("walk", 17), (None, 0), ([], 0)]:
            with self.subTest(kind=kind, index=index):
                before = game.state()
                with self.assertRaises(GameError):
                    game.act(kind, index)
                self.assertEqual(game.state(), before)
        for level_id in [None, [], "missing", True]:
            with self.assertRaises(GameError):
                Game(level_id)

    def test_hints_are_non_mutating_and_solve_all_levels(self):
        for level in LEVELS:
            game = Game(level.id)
            for _ in range(60):
                before = (game.tiles, game.hero, game.moves, game.steps, len(game.history))
                hint = game.act("hint")["hint"]
                self.assertEqual(before, (game.tiles, game.hero, game.moves, game.steps, len(game.history)))
                self.assertIsNotNone(hint, level.id)
                game.act(hint["type"], hint["index"], hint.get("to"))
                if game.state()["won"]:
                    break
            self.assertTrue(game.state()["won"], level.id)

    def test_hint_after_user_walk_does_not_need_return_to_entrance(self):
        game = Game("aube")
        game.act("walk", 2)
        hint = game.act("hint")["hint"]
        self.assertEqual((hint["type"], hint["index"]), ("slide", 10))

    def test_solver_can_recover_from_off_witness_move(self):
        game = Game("aube")
        game.act("slide", 5)
        plan = solve_plan(game, time_limit=2)
        self.assertIsNotNone(plan)
        for action in plan:
            game.act(*action)
        self.assertTrue(game.state()["won"])

    def test_solver_budget_exhaustion_is_explicit(self):
        game = Game("aube")
        self.assertIsNone(solve_plan(game, max_states=0))

    def test_random_legal_slides_preserve_tile_identity_and_hero(self):
        rng = random.Random(42)
        game = Game("relais")
        game.act("walk", 5)
        ids = sorted(t.id for t in game.tiles if t)
        hero_tile = game.tiles[5]
        for _ in range(300):
            source = rng.choice(game.state()["slidable"])
            game.act("slide", source)
            self.assertEqual(sum(t is None for t in game.tiles), 1)
            self.assertEqual(sorted(t.id for t in game.tiles if t), ids)
            self.assertEqual(game.tiles[5], hero_tile)
            self.assertEqual(game.hero, 5)


class HazardTests(unittest.TestCase):
    def test_crocodile_cell_is_reachable_and_ends_the_walk(self):
        game = Game()
        tiles = list(make_tiles("capture", ["WE"] * 16, 15))
        tiles[0] = Tile("croc", ("W", "E"), "crocodile")
        game.tiles = tuple(tiles)
        self.assertTrue(game.state()["canEnter"])
        self.assertIn(0, game.state()["reachable"])
        state = game.act("walk", 0)
        self.assertTrue(state["lost"])
        self.assertFalse(state["won"])
        self.assertEqual(state["caughtBy"], {"kind": "crocodile", "index": 0})
        self.assertEqual(state["hero"], 0)
        self.assertEqual(state["walkPath"], [-1, 0])

    def test_crossing_stops_at_first_crocodile_without_later_interactions(self):
        game = Game()
        tiles = list(make_tiles("capture", ["WE"] * 16, 15))
        tiles[1] = Tile("first-croc", ("W", "E"), "crocodile")
        tiles[2] = Tile("second-croc", ("W", "E"), "crocodile", engraved=True)
        game.level = replace(game.level, tiles=tuple(tiles), levers=(2,), relic=3, secret="crypte")
        game.act("reset")
        self.assertIn(3, game.state()["reachable"])
        self.assertEqual(game.state()["walkRoutes"]["3"], [-1, 0, 1])
        state = game.act("walk", 3)
        self.assertTrue(state["lost"])
        self.assertEqual(state["hero"], 1)
        self.assertEqual(state["steps"], 2)
        self.assertEqual(state["walkPath"], [-1, 0, 1])
        self.assertFalse(state["relic"]["taken"])
        self.assertFalse(state["levers"][0]["pulled"])
        self.assertFalse(state["descent"]["revealed"])
        self.assertFalse(state["descent"]["here"])

    def test_capture_does_not_activate_objects_on_the_crocodile_cell(self):
        game = Game()
        tiles = list(make_tiles("capture", ["WE"] * 16, 15))
        tiles[0] = Tile("croc", ("W", "E"), "crocodile", engraved=True)
        game.level = replace(game.level, tiles=tuple(tiles), levers=(0,), relic=0, secret="crypte")
        game.act("reset")
        state = game.act("walk", 0)
        self.assertTrue(state["lost"])
        self.assertFalse(state["relic"]["taken"])
        self.assertFalse(state["gatesOpen"])
        self.assertFalse(state["descent"]["revealed"])

    def test_patrol_capture_locks_the_game_until_restart(self):
        game = Game("gardiens")
        initial = game.state()
        state = game.act("walk", 1)
        self.assertTrue(state["lost"])
        self.assertEqual(state["caughtBy"], {"kind": "guardian", "index": 1})
        for action, index in (("walk", 0), ("slide", 10), ("tide", None), ("undo", None), ("hint", None)):
            with self.subTest(action=action):
                with self.assertRaisesRegex(GameError, "Recommencez"):
                    game.act(action, index)
                self.assertEqual(game.state(), state)
        self.assertEqual(state["walkRoutes"], {})
        self.assertEqual(state["slideOptions"], [])
        self.assertFalse(state["canExit"])
        self.assertFalse(state["canTide"])
        self.assertEqual(game.act("reset"), initial)
        self.assertFalse(game.act("walk", 0)["lost"])

    def test_a_safe_detour_stays_preferred_to_a_crocodile_shortcut(self):
        game = Game()
        ports = ["WES", "WE", "WS", "", "NE", "WE", "WN", "", "", "", "", "", "", "", "", ""]
        tiles = list(make_tiles("detour", ports, 15))
        tiles[1] = Tile("croc", ("W", "E"), "crocodile")
        game.tiles = tuple(tiles)
        self.assertNotIn(1, paths_from(game.board, game.hero))
        self.assertIn(1, game.state()["reachable"])
        state = game.act("walk", 2)
        self.assertEqual(state["walkPath"], [-1, 0, 4, 5, 6, 2])
        self.assertFalse(state["lost"])

    def test_braises_requires_reusing_path_after_a_collapse(self):
        game = Game("braises")
        # A static path between opposite corners needs at least seven cells.
        self.assertEqual(sum(bool(tile and len(tile.ports) > 1) for tile in game.tiles), 6)
        state = game.act("walk", 5)
        self.assertEqual(state["emptyCells"], [1, 2])
        for action in game.level.solution[1:]:
            game.act(*action)
        self.assertTrue(game.state()["won"])
        self.assertEqual(game.tiles[6].id, "braises-0")

    def test_crocodile_travels_with_its_stone(self):
        game = Game()
        tiles = list(make_tiles("guard", ["WE"] * 16, 1))
        tiles[0] = Tile("croc", ("W", "E"), "crocodile")
        game.tiles = tuple(tiles)
        self.assertTrue(game.state()["canEnter"])
        state = game.act("slide", 0, 1)
        self.assertEqual(state["tiles"][1]["id"], "croc")
        self.assertEqual(state["tiles"][1]["hazard"], "crocodile")

    def test_current_limits_departure_and_exact_preview_routes(self):
        game = Game()
        ports = ["WE", "WE", "WS", "", "", "", "NE", "", "", "", "", "", "", "", "", ""]
        tiles = list(make_tiles("water", ports, 15))
        tiles[1] = Tile("current", ("W", "E"), "current", "E")
        game.tiles = tuple(tiles)
        self.assertEqual(game.state()["walkRoutes"]["6"], [-1, 0, 1, 2, 6])
        game.act("walk", 6)
        self.assertNotIn("0", game.state()["walkRoutes"])
        with self.assertRaises(GameError):
            game.act("walk", 0)
        self.assertEqual(game.act("walk", 1)["hero"], 1)
        self.assertNotIn("0", game.state()["walkRoutes"])

    def test_fragile_crossing_creates_a_hole_and_undo_restores_it(self):
        game = Game("cendres")
        initial = game.state()
        self.assertNotIn("1", initial["walkRoutes"])
        self.assertEqual(initial["walkRoutes"]["5"], [-1, 0, 1, 5])
        with self.assertRaisesRegex(GameError, "sans arrêt"):
            game.act("walk", 1)
        state = game.act("walk", 5)
        self.assertEqual(state["emptyCells"], [1, 3])
        self.assertEqual(state["collapsed"], [{"index": 1, "tileId": "cendres-1", "pathStep": 2}])
        self.assertIn({"index": 2, "to": 1}, state["slideOptions"])
        restored = game.act("undo")
        self.assertEqual(restored["walkPath"], [5, 1, 0, -1])
        for key in ("tiles", "hero", "moves", "steps", "emptyCells"):
            self.assertEqual(restored[key], initial[key])
        self.assertEqual(restored["collapsed"], [])

    def test_multiple_holes_accept_explicit_target_and_reject_bad_target_atomically(self):
        game = Game("cendres")
        game.act("walk", 5)
        state = game.state()
        self.assertIn({"index": 2, "to": 1}, state["slideOptions"])
        self.assertIn({"index": 2, "to": 3}, state["slideOptions"])
        for target in (True, -1, 4, 1.0):
            with self.assertRaises(GameError):
                game.act("slide", 2, target)
            self.assertEqual(game.state(), state)
        tile = state["tiles"][2]
        self.assertEqual(game.act("slide", 2, 3)["tiles"][3], tile)
        game.act("undo")
        self.assertEqual(game.act("slide", 2)["tiles"][1], tile)

    def test_default_walk_crosses_fragile_without_stopping(self):
        game = Game("cendres")
        self.assertEqual(game.act("walk")["hero"], 0)
        state = game.act("walk")
        self.assertEqual(state["hero"], 5)
        self.assertEqual(state["walkPath"], [0, 1, 5])
        self.assertEqual(state["emptyCells"], [1, 3])


class TrialTests(unittest.TestCase):
    """The rules added after the first campaign: patrols, seals, tide, chains, relics."""

    def test_patrol_steps_once_per_slide_and_announces_its_next_cell(self):
        game = Game("gardiens")
        state = game.state()
        self.assertEqual(state["guardians"], [{"index": 1, "next": 2, "route": [1, 2, 6, 5]}])
        self.assertIn(1, state["reachable"])
        self.assertEqual(game.act("slide", 10)["guardians"][0]["index"], 2)
        state = game.act("slide", 14)
        self.assertEqual(state["guardians"][0]["index"], 6)
        self.assertTrue(state["canExit"])
        self.assertTrue(game.act("walk", FINISH)["won"])
        self.assertEqual(game.moves, game.level.par)

    def test_guardian_waits_at_a_gap_and_pins_the_stone_it_stands_on(self):
        game = Game("gardiens")
        game.act("slide", 10)          # guardian steps onto cell 2
        self.assertNotIn(2, game.state()["slidable"])
        with self.assertRaisesRegex(GameError, "pèse sur cette pierre"):
            game.act("slide", 2)
        # Empty the cell the guardian wants next; it stays where it is.
        game.act("slide", 6, 10)
        self.assertEqual(game.state()["guardians"][0], {"index": 2, "next": 2, "route": [1, 2, 6, 5]})
        self.assertEqual(game.act("slide", 5, 6)["guardians"][0]["index"], 6)

    def test_undo_rewinds_the_patrol_with_the_stones(self):
        game = Game("gardiens")
        before = game.state()
        game.act("slide", 10)
        restored = game.act("undo")
        for key in ("tiles", "guardians", "reachable", "slidable", "moves"):
            self.assertEqual(restored[key], before[key])

    def test_lever_latches_the_gate_open_only_once_lumen_stands_on_it(self):
        game = Game("sceaux")
        game.act("slide", 9, 5)
        game.act("slide", 10, 11)
        state = game.state()
        self.assertFalse(state["gatesOpen"])
        self.assertEqual(state["levers"], [{"index": 5, "pulled": False}])
        self.assertFalse(state["canExit"])
        with self.assertRaisesRegex(GameError, "porte est close"):
            game.act("walk", 3)
        state = game.act("walk", 5)
        self.assertTrue(state["gatesOpen"])
        self.assertEqual(state["levers"], [{"index": 5, "pulled": True}])
        self.assertTrue(state["canExit"])
        self.assertFalse(game.act("undo")["gatesOpen"])

    def test_weight_seal_holds_the_gate_open_only_while_the_stone_stays(self):
        game = Game("contrepoids")
        self.assertEqual(game.state()["seals"], [{"index": 4, "pressed": False}])
        for action in game.level.solution[:-1]:
            game.act(*action)
        state = game.state()
        self.assertEqual(state["seals"], [{"index": 4, "pressed": True}])
        self.assertTrue(state["gatesOpen"])
        self.assertTrue(state["canExit"])
        # Lifting the ballast closes the gate again.
        game.act("slide", 4, 8)
        self.assertFalse(game.state()["gatesOpen"])
        self.assertFalse(game.state()["canExit"])

    def test_tide_reverses_currents_and_uncovers_submerged_stones(self):
        game = Game("reflux")
        game.act("slide", 10)
        state = game.act("walk", 7)
        self.assertEqual(state["tide"], "haute")
        self.assertFalse(state["canExit"])
        self.assertEqual(state["tiles"][7]["heading"], "N")
        with self.assertRaisesRegex(GameError, "sous l’eau"):
            game.act("walk", 11)
        state = game.act("tide")
        self.assertEqual(state["tide"], "basse")
        self.assertEqual(state["tiles"][7]["heading"], "S")
        self.assertTrue(state["canExit"])
        self.assertEqual(game.moves, 2)
        self.assertEqual(game.act("undo")["tide"], "haute")

    def test_tide_is_refused_where_there_is_no_lever(self):
        game = Game("aube")
        self.assertFalse(game.state()["canTide"])
        before = game.state()
        with self.assertRaisesRegex(GameError, "levier de marée"):
            game.act("tide")
        self.assertEqual(game.state(), before)

    def test_a_collapse_cracks_its_brittle_neighbours_and_the_preview_says_so(self):
        game = Game("fissures")
        state = game.act("slide", 9)
        self.assertEqual(state["walkImpact"]["5"], {"collapse": [1], "weaken": [0, 5]})
        state = game.act("walk", 5)
        self.assertEqual(state["collapsed"], [{"index": 1, "tileId": "fissures-1", "pathStep": 2}])
        self.assertEqual(state["weakened"], [0, 5])
        self.assertEqual(state["tiles"][0]["hazard"], "fragile")
        self.assertEqual(state["tiles"][5]["hazard"], "fragile")
        # The stone under Lumen is now fragile: leaving it opens a second hole.
        game.act("slide", 8)
        state = game.act("walk", FINISH)
        self.assertTrue(state["won"])
        self.assertIn(5, state["emptyCells"])
        restored = game.act("undo")
        self.assertEqual(restored["tiles"][5]["hazard"], "fragile")
        game.act("undo")
        self.assertEqual(game.act("undo")["tiles"][5]["hazard"], "brittle")

    def test_relics_are_dead_ends_that_no_solution_needs(self):
        treasures = [level for level in LEVELS if level.relic is not None]
        self.assertGreaterEqual(len(treasures), 12)
        for level in treasures:
            with self.subTest(level=level.id):
                self.assertEqual(len(level.tiles[level.relic].ports), 1, "un cul-de-sac")
                self.assertTrue(level.relicName)
                game = Game(level.id)
                self.assertEqual(game.state()["relic"],
                                 {"index": level.relic, "name": level.relicName, "taken": False})
                for action in level.solution:
                    game.act(*action)
                self.assertTrue(game.state()["won"])
                self.assertFalse(game.state()["relic"]["taken"], "le trésor reste optionnel")

    def test_a_relic_detour_is_collected_on_the_way_through(self):
        game = Game("aube")
        game.act("slide", 10)
        game.act("slide", 14)
        self.assertFalse(game.state()["relic"]["taken"])
        state = game.act("walk", 7)
        self.assertEqual(state["walkPath"], [-1, 0, 1, 2, 6, 10, 11, 7])
        self.assertTrue(state["relic"]["taken"])
        self.assertIn("l’Œil de jade", state["message"])
        self.assertTrue(game.act("walk", FINISH)["won"])
        self.assertTrue(game.state()["relic"]["taken"])
        self.assertEqual(game.moves, 2)


class SecretTests(unittest.TestCase):
    """Secret passages: an engraved stone, a room below, a way back up."""

    def test_every_secret_room_is_solvable_and_names_its_host_and_reward(self):
        self.assertGreaterEqual(len(SECRET_LEVELS), 6)
        for level in SECRET_LEVELS:
            with self.subTest(level=level.id):
                self.assertNotIn(level.id, {item.id for item in LEVELS}, "hors de la campagne numérotée")
                self.assertEqual(level.difficulty, "Secret")
                self.assertIn(level.host, LEVEL_BY_ID)
                self.assertEqual(LEVEL_BY_ID[level.host].secret, level.id, "l'hôte connaît sa salle")
                self.assertTrue(level.reward, "un compagnon à rapporter")
                self.assertTrue(level.public()["host"] and level.public()["reward"])
                game = Game(level.id)
                for action in level.solution:
                    game.act(*action)
                self.assertTrue(game.state()["won"])
                self.assertEqual(game.moves, level.par)

    def test_hosts_hide_one_engraved_dead_end_the_solution_never_treads(self):
        hosts = [level for level in LEVELS if level.secret]
        self.assertEqual({level.id for level in hosts}, set(SECRET_SPURS))
        for level in hosts:
            with self.subTest(level=level.id):
                engraved = [tile for tile in level.tiles if tile and tile.engraved]
                self.assertEqual(len(engraved), 1)
                # One port only, like a relic stone: no corridor can ever reuse it.
                self.assertEqual(len(engraved[0].ports), 1)
                self.assertTrue(level.public()["secret"])
                game = Game(level.id)
                self.assertEqual(game.state()["descent"],
                                 {"level": level.secret, "revealed": False, "here": False})
                for action in level.solution:
                    game.act(*action)
                    self.assertFalse(game.revealed, "la solution d'auteur ne découvre rien")
                self.assertTrue(game.state()["won"])
                self.assertFalse(game.state()["descent"]["revealed"])

    def test_unmarked_levels_expose_no_descent(self):
        level = next(item for item in LEVELS if not item.secret)
        self.assertIsNone(Game(level.id).state()["descent"])
        self.assertFalse(level.public()["secret"])

    def test_bringing_the_engraved_stone_to_its_branch_opens_the_stairs(self):
        # The stone's corridor faces its anchor; sliding only stones the route
        # never uses, it must reach the branch. Then standing on it reveals the way.
        for host, (branch, anchor, side, stone) in SECRET_SPURS.items():
            with self.subTest(host=host):
                level = LEVEL_BY_ID[host]
                game = Game(level.id)
                for action in level.solution[:-1]:
                    game.act(*action)
                board = game.board
                route = {c for c in paths_from(board, game.hero)[FINISH] if 0 <= c < FINISH}
                free = {i for i in range(FINISH) if i not in route and i != game.hero and i != level.relic}
                where = next(i for i, tile in enumerate(board.tiles) if tile and tile.id == stone)
                holes = tuple(sorted(i for i in free if board.tiles[i] is None))
                start, seen, queue = (holes, where), {(holes, where): None}, [(holes, where)]
                while queue and queue[0][1] != branch:
                    state = queue.pop(0)
                    for hole in state[0]:
                        for _, source in neighbors(hole):
                            if source not in free or source in state[0]:
                                continue
                            nxt = (tuple(sorted(h if h != hole else source for h in state[0])),
                                   hole if source == state[1] else state[1])
                            if nxt not in seen:
                                seen[nxt] = (state, (source, hole)); queue.append(nxt)
                self.assertTrue(queue, "la pierre gravée doit pouvoir rejoindre l'embranchement")
                moves, state = [], queue[0]
                while seen[state] is not None:
                    state, move = seen[state]; moves.append(move)
                for source, hole in reversed(moves):
                    game.act("slide", source, hole)
                self.assertEqual(game.tiles[branch].id, stone)
                self.assertFalse(game.state()["descent"]["here"])
                state = game.act("walk", branch)
                self.assertEqual(state["descent"], {"level": level.secret, "revealed": True, "here": True})
                self.assertIn("escalier", state["message"])
                restored = game.act("undo")
                self.assertFalse(restored["descent"]["revealed"], "l'annulation referme la pierre")
                game.act("walk", branch)
                self.assertTrue(game.act("walk", FINISH)["won"], "la descente n'engage pas : le portail reste à prendre")
                self.assertTrue(game.state()["descent"]["revealed"], "une fois trouvé, c'est trouvé")

    def test_secret_room_hints_start_from_the_witness(self):
        for level in SECRET_LEVELS:
            with self.subTest(level=level.id):
                game = Game(level.id)
                hint = game.act("hint")["hint"]
                self.assertIsNotNone(hint)
                game.act(hint["type"], hint["index"], hint.get("to"))


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.dist = Path(cls.temp.name) / "dist"
        cls.dist.mkdir()
        (cls.dist / "index.html").write_text("<h1>Lumen</h1>", encoding="utf-8")
        (cls.dist / "main.js").write_text("const lumen = true", encoding="utf-8")
        (Path(cls.temp.name) / "private.txt").write_text("secret", encoding="utf-8")
        cls.server = GameServer(("127.0.0.1", 0), dist=cls.dist, accounts_path=Path(cls.temp.name) / "accounts.json")
        _, token = cls.server.accounts.authenticate("EngineTests", "test-password", register=True)
        cls.cookie = "lumen_session=" + token
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)
        cls.temp.cleanup()

    def request(self, method, path, body=None, raw=None, headers=None):
        client = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        request_headers = {"Cookie": self.cookie, **(headers or {})}
        if body is not None:
            raw = json.dumps(body)
            request_headers = {"Content-Type": "application/json", **request_headers}
        client.request(method, path, body=raw, headers=request_headers)
        response = client.getresponse()
        data = response.read()
        status, response_headers = response.status, dict(response.getheaders())
        client.close()
        return status, response_headers, data

    def test_http_game_lifecycle(self):
        status, _, data = self.request("GET", "/api/health")
        self.assertEqual(status, 200)
        self.assertTrue(json.loads(data)["ok"])
        status, _, data = self.request("GET", "/api/levels")
        payload = json.loads(data)
        levels = payload["levels"]
        self.assertEqual(len(levels), len(CAMPAIGN_LEVELS))
        self.assertEqual({item["id"] for item in payload["secrets"]}, {item.id for item in SECRET_LEVELS})
        self.assertTrue(all(item["host"] for item in payload["secrets"]))
        self.assertEqual([level["biome"] for level in levels],
                         [level.biome for level in CAMPAIGN_LEVELS])
        status, headers, data = self.request("POST", "/api/game", {"levelId": "aube"})
        self.assertEqual(status, 200)
        self.assertIn("utf-8", headers["Content-Type"])
        state = json.loads(data)
        game_id = state["id"]
        for action, index in LEVELS[0].solution:
            status, _, data = self.request("POST", "/api/action", {
                "gameId": game_id, "type": action, "index": index})
            self.assertEqual(status, 200, data)
        self.assertTrue(json.loads(data)["won"])
        status, _, data = self.request("GET", "/api/game?id=" + game_id)
        self.assertTrue(json.loads(data)["won"])

    def test_http_space_game_uses_all_twenty_seven_cells(self):
        status, _, data = self.request("POST", "/api/game", {"levelId": "orbite"})
        self.assertEqual(status, 200)
        state = json.loads(data)
        self.assertEqual(state["boardKind"], "volume")
        self.assertEqual((state["size"], state["depth"], len(state["tiles"])), (3, 3, 27))
        for kind, index, *target in SPACE_LEVELS[0].solution:
            action = {"gameId": state["id"], "type": kind, "index": index}
            if target:
                action["to"] = target[0]
            status, _, data = self.request("POST", "/api/action", action)
            self.assertEqual(status, 200, data)
            state = json.loads(data)
        self.assertTrue(state["won"])
        self.assertEqual(state["hero"], 27)
        status, _, data = self.request("POST", "/api/action", {"gameId": state["id"], "type": "undo"})
        self.assertEqual(status, 200)
        self.assertFalse(json.loads(data)["won"])

    def test_http_lunar_game_reaches_the_underside_without_altering_orbital_levels(self):
        status, _, data = self.request("POST", "/api/game", {"levelId": LUNAR_LEVELS[0].id})
        self.assertEqual(status, 200)
        state = json.loads(data)
        self.assertEqual(state["boardKind"], "surface")
        self.assertEqual(state["region"], "moon")
        self.assertEqual(len(state["tiles"]), 27)
        for kind, index, *target in LUNAR_LEVELS[0].solution:
            action = {"gameId": state["id"], "type": kind, "index": index}
            if target:
                action["to"] = target[0]
            status, _, data = self.request("POST", "/api/action", action)
            self.assertEqual(status, 200, data)
            state = json.loads(data)
        self.assertTrue(state["won"])
        self.assertEqual(state["heroFace"], "D")
        self.assertEqual(state["hero"], state["finishIndex"])
        self.assertEqual([level.biomeLevel for level in LUNAR_LEVELS], [6, 7, 8, 9, 10])
        self.assertEqual(len(SPACE_LEVELS), 5)

    def test_http_rejects_malformed_and_missing_resources(self):
        cases = [
            ("POST", "/api/game", {"levelId": []}, None, None, 400),
            ("POST", "/api/game", {"levelId": "aube", "extra": 1}, None, None, 400),
            ("POST", "/api/game", None, "[", {"Content-Type": "application/json"}, 400),
            ("POST", "/api/game", None, "[]", {"Content-Type": "application/json"}, 400),
            ("POST", "/api/action", {"gameId": "missing", "type": "hint"}, None, None, 404),
            ("GET", "/api/game", None, None, None, 400),
            ("GET", "/api/game?id=missing", None, None, None, 404),
            ("GET", "/api/nope", None, None, None, 404),
            ("GET", "/../private.txt", None, None, None, 403),
            ("GET", "/%2e%2e/private.txt", None, None, None, 403),
            ("GET", "/%5c..%5cprivate.txt", None, None, None, 400),
            ("GET", "/missing.js", None, None, None, 404),
        ]
        for method, path, body, raw, headers, expected in cases:
            with self.subTest(method=method, path=path, body=body):
                status, _, data = self.request(method, path, body, raw, headers)
                self.assertEqual(status, expected, data)
                self.assertIn("error", json.loads(data))

    def test_http_boolean_index_rejected(self):
        _, _, data = self.request("POST", "/api/game", {"levelId": "aube"})
        game_id = json.loads(data)["id"]
        status, _, data = self.request("POST", "/api/action", {
            "gameId": game_id, "type": "slide", "index": True})
        self.assertEqual(status, 400)

    def test_http_collapse_and_explicit_hole_choice(self):
        _, _, data = self.request("POST", "/api/game", {"levelId": "cendres"})
        game_id = json.loads(data)["id"]
        status, _, data = self.request("POST", "/api/action", {
            "gameId": game_id, "type": "walk", "index": 5})
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data)["emptyCells"], [1, 3])
        tile = json.loads(data)["tiles"][2]
        status, _, data = self.request("POST", "/api/action", {
            "gameId": game_id, "type": "slide", "index": 2, "to": 3})
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data)["tiles"][3], tile)

    def test_static_client_and_local_development_origin(self):
        status, _, data = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn(b"Lumen", data)
        status, headers, _ = self.request("GET", "/main.js")
        self.assertEqual(status, 200)
        self.assertIn("javascript", headers["Content-Type"])
        status, headers, _ = self.request("OPTIONS", "/api/game", headers={"Origin": "http://localhost:5173"})
        self.assertEqual(status, 204)
        self.assertEqual(headers["Access-Control-Allow-Origin"], "http://localhost:5173")
        _, headers, _ = self.request("GET", "/api/health", headers={"Origin": "https://example.org"})
        self.assertNotIn("Access-Control-Allow-Origin", headers)


if __name__ == "__main__":
    unittest.main()

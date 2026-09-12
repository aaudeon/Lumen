"""Verification des epoques et des fragments des Archives des Echos."""
import unittest

from backend.engine import GameError, FINISH
from backend.echoes import EchoGame, ECHO_LEVELS


class EchoTests(unittest.TestCase):
    def test_five_solutions_visit_both_epochs_and_open_the_gate(self):
        self.assertEqual(len(ECHO_LEVELS), 5)
        for level in ECHO_LEVELS:
            with self.subTest(level=level.id):
                game = EchoGame(level.id)
                epochs = set()
                self.assertFalse(game.state()["canExit"])
                for action in level.solution:
                    state = game.act(*action)
                    epochs.add(state["echoes"]["phase"])
                self.assertTrue(state["won"])
                self.assertTrue(state["echoes"]["gateOpen"])
                self.assertEqual(epochs, {0, 1})
                self.assertEqual(game.steps, level.stepPar)
                self.assertEqual(game.moves, level.par)
                self.assertTrue(all(fragment["taken"] for fragment in state["echoes"]["fragments"]))

    def test_epoch_shift_requires_a_chronolith_and_preserves_positions(self):
        game = EchoGame()
        before = game.state()
        with self.assertRaises(GameError):
            game.act("echo")
        self.assertEqual(game.state(), before)
        for action in game.level.solution[:3]:
            game.act(*action)
        game.act("walk", 5)
        before = game.state()
        after = game.act("echo")
        self.assertEqual([tile["id"] if tile else None for tile in before["tiles"]], [tile["id"] if tile else None for tile in after["tiles"]])
        self.assertEqual(after["hero"], 5)
        self.assertNotEqual(before["tiles"][5]["ports"], after["tiles"][5]["ports"])
        self.assertEqual(after["moves"], before["moves"] + 1)
        restored = game.act("undo")
        for key in ("tiles", "echoes", "hero", "moves", "steps"):
            self.assertEqual(restored[key], before[key])

    def test_fragments_are_epoch_specific_and_the_gate_needs_every_fragment(self):
        game = EchoGame()
        for action in game.level.solution[:3]:
            game.act(*action)
        state = game.act("walk", 12)
        self.assertTrue(state["echoes"]["fragments"][0]["taken"])
        self.assertFalse(state["canExit"])
        with self.assertRaises(GameError):
            game.act("walk", FINISH)
        self.assertFalse(game.act("undo")["echoes"]["fragments"][0]["taken"])
        game.act("walk", 5)
        game.act("echo")
        state = game.act("walk", 11)
        self.assertFalse(state["echoes"]["fragments"][0]["taken"])
        self.assertTrue(state["echoes"]["fragments"][1]["taken"])
        self.assertFalse(state["canExit"])

    def test_hints_are_non_mutating_and_finish_each_expedition(self):
        for level in ECHO_LEVELS:
            game = EchoGame(level.id)
            for _ in range(len(level.solution) + 12):
                if game.state()["won"]:
                    break
                before = (game.tiles, game.hero, game.epoch, game.memories, game.moves)
                hint = game.act("hint")["hint"]
                self.assertEqual((game.tiles, game.hero, game.epoch, game.memories, game.moves), before)
                self.assertIsNotNone(hint, level.id)
                game.act(hint["type"], hint["index"], hint.get("to"))
            self.assertTrue(game.state()["won"], level.id)

    def test_each_relic_is_an_optional_detour_in_the_past_and_reset_restores_everything(self):
        for level in ECHO_LEVELS:
            with self.subTest(level=level.id):
                game = EchoGame(level.id)
                initial = game.state()
                collected = False
                for action in level.solution:
                    game.act(*action)
                    if not collected and game.epoch == 1 and str(level.relic) in game.state()["walkRoutes"]:
                        origin = game.hero
                        self.assertTrue(game.act("walk", level.relic)["relic"]["taken"])
                        game.act("walk", origin)
                        collected = True
                self.assertTrue(collected)
                self.assertTrue(game.state()["won"])
                self.assertEqual(game.act("reset"), initial)

    def test_memories_and_phases_survive_interleaved_slides_and_undo(self):
        game = EchoGame()
        for action in game.level.solution[:6]:
            game.act(*action)
        before = game.state()
        option = before["slideOptions"][0]
        game.act("slide", option["index"], option["to"])
        restored = game.act("undo")
        for key in ("tiles", "hero", "moves", "steps", "echoes"):
            self.assertEqual(restored[key], before[key])


if __name__ == "__main__":
    unittest.main()
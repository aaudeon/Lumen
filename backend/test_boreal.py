"""The momentum rule and the northern campaign's irreversible transitions."""
import unittest
from dataclasses import replace

try:
    from .engine import Game, GameError, Tile, Board, LEVELS, paths_from, FINISH
except ImportError:
    from engine import Game, GameError, Tile, Board, LEVELS, paths_from, FINISH


class BorealTests(unittest.TestCase):
    def test_ice_intersection_keeps_each_incoming_direction(self):
        tiles=[None]*16
        for i,ports in {0:"WES",1:"WS",4:"NE",5:"NESW",6:"W",9:"N"}.items():
            tiles[i]=Tile(str(i),tuple(ports),"ice" if i==5 else None)
        board=Board(tuple(tiles),LEVELS[-5])
        paths=paths_from(board,0)
        self.assertEqual(paths[9],[0,1,5,9])
        self.assertEqual(paths[6],[0,4,5,6])
        self.assertNotIn(5,paths)

    def test_a_connected_corner_on_ice_is_not_a_walkable_turn(self):
        game=Game("banquise")
        tiles=[None]*16
        for i,ports in {0:"WE",1:"WS",5:"N"}.items():
            tiles[i]=Tile(str(i),tuple(ports),"ice" if i==1 else None)
        game.tiles=tuple(tiles)
        before=game.state()
        self.assertNotIn(5,before["reachable"])
        for target in (1,5):
            with self.assertRaises(GameError):game.act("walk",target)
            self.assertEqual(game.state(),before)

    def test_new_world_hints_finish_and_undo_restores_the_last_action(self):
        for level in LEVELS[-5:]:
            with self.subTest(level=level.id):
                game=Game(level.id)
                for _ in range(len(level.solution)+2):
                    if game.hero==FINISH:break
                    before=game.state()
                    hint=game.act("hint")["hint"]
                    self.assertIsNotNone(hint)
                    game.act(hint["type"],hint.get("index"),hint.get("to"))
                    after=game.state()
                    game.act("undo")
                    for key in ("tiles","hero","moves","steps","gatesOpen","levers","seals","relic"):
                        self.assertEqual(game.state()[key],before[key])
                    game.act(hint["type"],hint.get("index"),hint.get("to"))
                    self.assertEqual(game.state()["hero"],after["hero"])
                self.assertEqual(game.hero,FINISH)

    def test_finale_requires_both_levers_and_weight(self):
        game=Game("aurore")
        # Restore the authored setup, then cross the bridge to the first lever.
        for action in game.level.solution[:21]:game.act(*action)
        self.assertEqual(game.hero,3)
        self.assertIsNone(game.tiles[2])
        self.assertFalse(game.state()["gatesOpen"])
        for action in game.level.solution[21:23]:game.act(*action)
        self.assertTrue(game.board.pressed(6))
        self.assertFalse(game.state()["gatesOpen"])
        game.act("walk",11)
        self.assertTrue(game.state()["gatesOpen"])
        game.act("walk",FINISH)
        self.assertTrue(game.state()["won"])

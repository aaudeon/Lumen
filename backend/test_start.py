"""Verification du choix de port sans lancer de serveur ni de navigateur."""

import unittest
from unittest.mock import patch

from start import select_port


class LauncherPortTests(unittest.TestCase):
    @patch("start.health_ok")
    @patch("start.port_in_use", return_value=False)
    def test_default_port_is_free(self, occupied, health):
        self.assertEqual(select_port(None), (8765, False))
        occupied.assert_called_once_with(8765)
        health.assert_not_called()

    @patch("start.health_ok", return_value=False)
    @patch("start.port_in_use", side_effect=[True, True, False])
    def test_skips_ports_used_by_other_programs(self, occupied, health):
        self.assertEqual(select_port(None), (8767, False))
        self.assertEqual(occupied.call_count, 3)
        self.assertEqual(health.call_count, 2)

    @patch("start.health_ok", side_effect=[False, True])
    @patch("start.port_in_use", return_value=True)
    def test_reuses_existing_lumen_on_fallback_port(self, occupied, health):
        self.assertEqual(select_port(None), (8766, True))
        health.assert_called_with("http://127.0.0.1:8766")

    @patch("start.health_ok", return_value=True)
    @patch("start.port_in_use", return_value=True)
    def test_reuses_existing_lumen_on_default_port(self, occupied, health):
        self.assertEqual(select_port(None), (8765, True))

    @patch("start.port_in_use", return_value=False)
    def test_respects_explicit_port(self, occupied):
        self.assertEqual(select_port(9000), (9000, False))
        occupied.assert_called_once_with(9000)

    @patch("start.health_ok", return_value=False)
    @patch("start.port_in_use", return_value=True)
    def test_explicit_occupied_port_does_not_fall_back(self, occupied, health):
        with self.assertRaisesRegex(RuntimeError, "9000 est deja utilise"):
            select_port(9000)
        occupied.assert_called_once_with(9000)

    @patch("start.health_ok", return_value=False)
    @patch("start.port_in_use", return_value=True)
    def test_search_is_bounded(self, occupied, health):
        with self.assertRaisesRegex(RuntimeError, "Aucun port disponible"):
            select_port(None)
        self.assertEqual(occupied.call_count, 20)


if __name__ == "__main__":
    unittest.main()
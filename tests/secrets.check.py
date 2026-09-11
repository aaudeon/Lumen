"""Every secret room must be a real, harder puzzle its host could hide.

Run: python tests/secrets.check.py [id ...]        (add --lenient while rooms are being written)

A room is checked for: living in the hidden registry with a host that names it
back; a witness that wins with the recorded par; a relic the witness never takes;
hints that lead from the very first state to the portal; and being harder than
its host — more sliding, at least one rule of the biome actually on the route.
"""
import os
import sys

# Windows consoles default to cp1252, which cannot print the verdict glyphs.
sys.stdout.reconfigure(encoding="utf-8")

if "--lenient" in sys.argv:
    os.environ["LUMEN_HIDDEN_LENIENT"] = "1"
    sys.argv.remove("--lenient")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.engine import FINISH, Game, LEVEL_BY_ID, SECRET_LEVELS  # noqa: E402

wanted = sys.argv[1:]
rooms = [room for room in SECRET_LEVELS if not wanted or room.id in wanted]
if wanted and len(rooms) < len(wanted):
    print("absent(s) du registre :", ", ".join(sorted(set(wanted) - {r.id for r in rooms})))
problems = []
for room in rooms:
    marks = []
    host = LEVEL_BY_ID.get(room.host)
    if host is None or host.secret != room.id:
        marks.append("l’hôte ne connaît pas cette salle")
    if "Ébauche" in room.subtitle or "ébauche" in room.name.lower():
        marks.append("encore une ébauche")
    game = Game(room.id)
    collector = Game(room.id)
    for action in room.solution[:-1]:
        collector.act(*action)
    if room.relic is not None:
        # Le détour doit permettre de rapporter la relique sans bloquer la sortie.
        collector.act("walk", room.relic)
        collected = collector.state()["relic"]["taken"]
        collector.act("walk", FINISH)
        if not collected or not collector.state()["won"]:
            marks.append("la relique ne peut pas être rapportée avant la sortie du témoin")
    for action in room.solution:
        game.act(*action)
    state = game.state()
    if not state["won"]:
        marks.append("le témoin ne gagne pas")
    if game.moves != room.par:
        marks.append(f"par {room.par} mais {game.moves} coups joués")
    if room.relic is None or not room.relicName:
        marks.append("pas de relique")
    elif state["relic"]["taken"]:
        marks.append("la relique n’est pas facultative")
    else:
        # Stones are shuffled, so the relic stone is found by id, wherever it starts.
        stone = next((t for t in room.tiles if t and t.id == f"{room.id}-{room.relic}"), None)
        if stone is None or len(stone.ports) != 1:
            marks.append("la relique n’est pas dans un cul-de-sac")
    if host and room.par <= host.par:
        marks.append(f"pas plus dure que son hôte ({room.par} ≤ {host.par} coups)")
    hazards = {t.hazard for t in room.tiles if t and t.hazard}
    if not hazards:
        marks.append("aucune règle du biome sur le plateau")
    if not room.reward:
        marks.append("aucun compagnon à rapporter")
    # Hints must carry a lost player from the start to the end.
    guided = Game(room.id)
    for _ in range(120):
        hint = guided.act("hint")["hint"]
        if hint is None:
            marks.append("un indice manque en cours de route")
            break
        guided.act(hint["type"], hint["index"], hint.get("to"))
        if guided.state()["won"]:
            break
    else:
        marks.append("les indices ne mènent pas au portail en 120 actions")
    verdict = f"  ✗ {' · '.join(marks)}" if marks else ""
    print(f"{room.id:12} sous {room.host:10} · par {room.par:2} vs hôte {host.par if host else '?':2}"
          f" · pas {room.stepPar:2} · règles {','.join(sorted(hazards)) or '—'} · relique {room.relicName or '—'}{verdict}")
    if marks:
        problems.append(f"{room.id} : {' · '.join(marks)}")

print(f"\n{len(rooms)} salle(s) secrète(s)")
if problems:
    print(f"{len(problems)} problème(s) :")
    for problem in problems:
        print("  -", problem)
    sys.exit(1)
print("salles conformes : chacune est un vrai puzzle, plus dur que son hôte, avec sa relique et son compagnon")

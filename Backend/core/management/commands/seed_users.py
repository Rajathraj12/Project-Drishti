from django.core.management.base import BaseCommand
import subprocess
import sys
from pathlib import Path

class Command(BaseCommand):
    help = 'Seeds MongoDB Atlas and Django SQLite with authentication accounts for all roles'

    def handle(self, *args, **options):
        seed_script = Path(__file__).resolve().parent.parent.parent.parent / 'seed_users.py'
        self.stdout.write(self.style.NOTICE(f"Executing {seed_script}..."))
        import runpy
        runpy.run_path(str(seed_script), run_name="__main__")
        self.stdout.write(self.style.SUCCESS("All role accounts successfully seeded!"))


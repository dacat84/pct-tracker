#!/usr/bin/env python3
"""One-time Garmin login on your own computer (garminconnect >= 0.3).

Asks for e-mail, password and (if Garmin wants it) the MFA code, then saves
the tokens to ~/.garminconnect-pct/garmin_tokens.json. Nothing is sent
anywhere except to Garmin. See scripts/GARMIN_SETUP.md for the next steps.
"""
import os
from getpass import getpass

from garminconnect import Garmin

STORE = os.path.expanduser("~/.garminconnect-pct")

email = input("Garmin e-mail: ").strip()
password = getpass("Garmin password (not shown while typing): ")
g = Garmin(email=email, password=password,
           prompt_mfa=lambda: input("MFA code from Garmin: ").strip())
g.login()
g.client.dump(STORE)
print(f"\nLogged in as {g.get_full_name()}. Tokens saved to {STORE}/garmin_tokens.json")
print("Next: pbcopy < ~/.garminconnect-pct/garmin_tokens.json  (then paste into the GARMIN_TOKENS secret)")

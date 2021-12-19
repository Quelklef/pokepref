import json
import requests
import base64
import os

fname = "./pokemon.txt"

with open(fname, 'r') as f:
    existing_pokemon = { line[:line.index(' ')] for line in f.readlines() }

with open(fname, 'a') as f:

    url = "https://pokeapi.co/api/v2/pokemon"
    while url:

        print(url)
        response = requests.get(url).json()
        url = response['next']

        for poke in response['results']:

            print(poke['name'])
            already_seen = poke['name'] in existing_pokemon
            is_special_form = '-' in poke['name']
            if already_seen or is_special_form:
                continue

            info = requests.get(poke['url']).json()
            sprite_bytes = requests.get(info['sprites']['front_default']).content
            sprite_b64 = base64.b64encode(sprite_bytes).decode('ascii')
            sprite_url = "data:image/png;base64," + sprite_b64
            f.write(poke['name'] + ' ' + sprite_url + '\n')

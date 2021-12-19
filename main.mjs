
// https://stackoverflow.com/a/12646864/4608364
function shuffle(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

// end util //

async function getPokes(count) {
  const pokeTextUrl = new URL(document.location.href).pathname.split('/').slice(0, -1).concat(['pokemon.txt']).join('/');
  const lines = (await (await fetch(pokeTextUrl)).text()).split('\n').filter(l => !!l);
  const pokes = lines.map(l => { const [name, spriteUrl] = l.split(' '); return { name, spriteUrl }; });

  const result = [];
  while (result.length < count && pokes.length > 0) {
    const index = Math.floor(Math.random() * pokes.length);
    const poke = pokes[index];
    pokes.splice(index, 1);
    result.push(poke);
  }
  return result;
}

async function phase1_intro($root, pokes) {
  $root.innerHTML = `
    <div style="text-align: center">
      <p>Make ${Math.pow(pokes.length, 2)} Pokemon comparisons and see what kind of order your opinion relation defines</p>
      <button onclick="document._phase1Resolve()">GO!</button>
    </div>
  `;

  return new Promise(resolve => document._phase1Resolve = resolve);
}

async function phase2_choices($root, pokes) {

  const choices = [];
  for (let i = 0; i < pokes.length; i++)
    for (let j = 0; j < i; j++)
      choices.push( [ pokes[i], pokes[j] ] );

  shuffle(choices);
  for (const choice of choices)
    shuffle(choice);

  const prefMat = {};
  for (const poke1 of pokes) {
    prefMat[poke1.name] = {};
    for (const poke2 of pokes) {
      prefMat[poke1.name][poke2.name] = undefined;
    }
  }

  for (const [poke1, poke2] of choices) {
    $root.innerHTML = `
      <div style="text-align: center">
        <p>Who do you prefer?</p>

        <div style="display: flex; align-items: center; padding: 20px; border: 1px solid grey;">
          ${ renderChoice(poke1) }
          <p style="width: 100px; text-align: center;">OR</p>
          ${ renderChoice(poke2) }
        </div>

        <br />
        <br />
        <button onclick="document._phase2Choose(null)">neither / don't know</button>
      </div>
    `;

    function renderChoice(poke, n) {
      return `
        <p style="text-align: center">
          <img src="${poke.spriteUrl}" id="${poke.name}" style="width: ${96 * 2}px; image-rendering: pixelated;" />
          <br />
          <button onclick="document._phase2Choose('${poke.name}')">${poke.name}</button>
        </p>
      `;
    }

    await new Promise(resolve => {
      document._phase2Choose = function(chosenName) {
        prefMat[poke1.name][poke2.name] = chosenName;
        prefMat[poke2.name][poke1.name] = chosenName;
        resolve();
      }
    });
  }

  return prefMat;

}

async function phase3_results($root, prefMat, pokes) {

  const pokeSpriteUrlByName = {};
  for (const poke of pokes)
    pokeSpriteUrlByName[poke.name] = poke.spriteUrl;

  let table = '<table>';

  table += '<tr>';
  table += '<td></td>';
  const row1 = prefMat[Object.keys(prefMat)[0]];
  for (let j = 0; j < Object.keys(row1).length; j++) {
    const colPokeName = Object.keys(row1).reverse()[j];
    table += `<td><img src="${pokeSpriteUrlByName[colPokeName]}" /></td>`;
  }
  table += '</tr>';

  for (let i = 0; i < Object.keys(prefMat).length; i++) {
    const rowPokeName = Object.keys(prefMat)[i];
    const row = prefMat[rowPokeName];
    table += '<tr>';
    table += `<td><img src="${pokeSpriteUrlByName[rowPokeName]}" /></td>`;
    for (let j = 0; j < Object.keys(row).length - i - 1; j++) {
      const colPokeName = Object.keys(row).reverse()[j];
      table += '<td>';
      const prefName = prefMat[rowPokeName][colPokeName];
      if (!prefName)
        table += 'n/a';
      else
        table += `<img src="${pokeSpriteUrlByName[prefName]}" />`;
      table += '</td>';
    }
    table += '</tr>';
  }

  table += '</table>';

  const { classification, isTotal, isAsymmetric, isTransitive } = classify(prefMat);

  $root.innerHTML = `

    <div style="display: flex; text-align: center;">
      <div>
        <h3>Preference Matrix</h3>
        <br />
        ${table}
        <style>
          table { border-collapse: collapse; }
          table tr:first-child { border-bottom: 1px solid grey; }
          table tr td:first-child { border-right: 1px solid grey; }
        </style>
      </div>
      <div style="margin-left: 50px; width: 150px;">
        <h3>Properties</h3>
        <br />
        <p>Transitive? ${renderBool(isTransitive)}</p>
        <p>Asymmetric? ${renderBool(isAsymmetric)}</p>
        <p>Total? ${renderBool(isTotal)}</p>
        <br />
        <p>Your preferences form <b>${classification ? 'a ' + classification : 'nothing special'}</b>!</p>
      </div>
    </div>

  `;

  function renderBool(b) {
    return b ? 'YES' : 'NO';
  }

}

function classify(prefMat) {

  // n.b. not very computationally efficient

  // Assumed
  const isReflexive = true;

  let isTotal = true;
  for (let a in prefMat)
    for (let b in prefMat[a])
      if (a !== b)
        isTotal = isTotal && !!prefMat[a][b];

  // Assumed
  const isAsymmetric = true;

  let isTransitive = true;
  for (let a in prefMat)
    for (let b in prefMat)
      for (let c in prefMat)
        if (a !== b && b !== c && c !== a)
          if (prefMat[a][b] === b && prefMat[b][c] === c && !!prefMat[a] && !!prefMat[b] && !!prefMat[c])
            isTransitive = isTransitive && (prefMat[a][c] === c);

  const classification = (
      isReflexive && isTransitive && isAsymmetric && isTotal ? 'linear order'
    : isReflexive && isTransitive && isAsymmetric ? 'partial order'
    : isReflexive && isTransitive ? 'preorder'
    : null
  );

  return { classification, isReflexive, isTotal, isAsymmetric, isTransitive };

}

async function main() {
  const pokes = await getPokes(5);
  const $root = document.getElementById('root');

  await phase1_intro($root, pokes);
  const prefMat = await phase2_choices($root, pokes);
  await phase3_results($root, prefMat, pokes);
}

console.log('ok');
main();

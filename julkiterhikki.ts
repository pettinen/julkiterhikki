import { parseArgs } from './deps.ts';


const authURL = 'https://julkiterhikki.valvira.fi/api/authenticate';
const searchURL = 'https://julkiterhikki.valvira.fi/api/search';

let cookie = '';

function getHeaders(transit = false) {
  const headers = new Headers();
  const contentType = transit ? 'application/transit+json' : 'application/json';
  headers.set('Accept', contentType);
  if (cookie)
    headers.set('Cookie', `julkiterhikki=${cookie}`);
  return headers;
}

function postHeaders(transit = false) {
  const headers = getHeaders(transit);
  headers.set('Content-Type', 'application/transit+json');
  return headers;
}

const answers = ["kissa", "kyllä", "hiiri", "syksy", "helsinki", "vasta", "kuusi", "korkeasaari", "ruotsi", "turkki"];
const numbers = ["nolla", "yksi", "kaksi", "kolme", "neljä", "viisi", "kuusi", "seitsemän", "kahdeksan", "yhdeksän", "kymmenen"];
for (const number of numbers.slice(1, 10))
  numbers.push(`${number}toista`);


async function authenticate() {
  const getResponse = await fetch(authURL, {
    headers: getHeaders(true)
  });

  const cookieHeader = getResponse.headers.get('Set-Cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/julkiterhikki=([^;]+)/);
    if (match && match[1])
      cookie = match[1];
  }

  let challenge = await getResponse.json();
  challenge = challenge[2];
  challenge = challenge[challenge.length - 1];

  let answerData;
  if (challenge[0] === '~:qa') {
    const questionID = challenge[1];
    const answer = answers[questionID];
    if (!answer)
      throw new Error(`Unknown question ID ${questionID}`);
    answerData = ['^ ', '~:id', ['~:fi', '~:qa', questionID], '~:answer', answer];
  } else if (challenge[0] === '~:addition') {
    const answerType = challenge[1][2];
    const origValues = challenge[1][4];

    let numericValues;
    if (typeof origValues[0] === 'string')
      numericValues = origValues.map((s: string) => numbers.indexOf(s));
    else
      numericValues = origValues;
    if (numericValues.includes(-1))
      throw new Error(`Unknown number in ${challenge[1][4]}`);
    const numericAnswer = numericValues[0] + numericValues[1];

    let answer;
    if (answerType === '~:numeric') {
      answer = numericAnswer.toString();
    } else if (answerType === '~:text') {
      answer = numbers[numericAnswer];
      if (!answer)
        throw new Error(`Unknown number ${numericAnswer}`);
    } else {
      throw new Error(`Unknown addition answer type ${answerType}`);
    }
    answerData = ['^ ', '~:id', ['~:fi', '~:addition', ['^ ', '~:type', answerType, '~:values', origValues]], '~:answer', answer];
  } else {
    throw new Error("Unknown challenge type");
  }

  const postResponse = await fetch(authURL, {
    method: 'POST',
    headers: postHeaders(true),
    body: JSON.stringify(answerData)
  });
  return postResponse.status === 200;
}

interface SearchParams {
  firstNames: string;
  lastName: string;
  index?: number;
}

async function search(params: SearchParams) {
  const data: (string|number)[] = ['^ ', '~:etunimet', params.firstNames, '~:sukunimi', params.lastName];
  if (params.index != null)
    data.push('~:indeksi', params.index);

  return fetch(searchURL, {
    method: 'POST',
    headers: postHeaders(),
    body: JSON.stringify(data)
  });
}


async function main() {
  const args = parseArgs(Deno.args, {string: '_'});
  if (args._.length < 2)
    throw new Error("At least one first name and a last name must be given");

  const firstNames = args._.slice(0, -1).join(' ');
  const lastName = args._[args._.length - 1] as string;
  let index;
  if (args.i != null && !Number.isNaN(Number(args.i)))
    index = Number(args.i);
  const searchParams = {firstNames, lastName, index};

  let searchResponse
  do {
    if (!await authenticate())
      throw new Error("Authentication failed");
    searchResponse = await search(searchParams);
  } while (searchResponse.status !== 200);

  console.log(await searchResponse.text());
}

if (import.meta.main)
  await main();

import fetch from 'node-fetch';

async function run() {
  try {
    const res = await fetch("http://0.0.0.0:3000/");
    console.log("Status:", res.status);
    console.log(await res.text());
  } catch (err) {
    console.error(err);
  }
}
run();

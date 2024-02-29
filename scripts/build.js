const files = [
  "variables.py",
  "zfill.py",
  "decop1.py",
  "decop2.py",
  "decode.py",
  "setBase64charset.py",
  "encode.py",
  "run.py",
];

const fs = require("fs");
const path = require("path");

const datas = files.map((file) => {
  const filePath = path.join(__dirname, file);
  const data = fs.readFileSync(filePath).toString();
  const ign = data.split("# @IGNORETOP");
  let dt = "";
  if (ign.length > 1) dt = ign[1];
  else dt = data;

  return dt.split("\n").map((line) => {
    return line.trim();
  });
});

fs.writeFileSync(
  path.join(__dirname, "..", "kmboxcommand.json"),
  JSON.stringify(datas.map((x) => [...x, "", "", "", ""]).flat(), null, 2)
);

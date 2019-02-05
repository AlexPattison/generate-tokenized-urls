console.log("Running Conversion");

const AWS = require("aws-sdk");
const args = require("yargs").argv;
const fs = require("fs");
const jwt = require("jsonwebtoken");
const secret = args["secret"];
const host = args["host"];
const input = args["input"];
const output = args["output"];
const bucket = args["bucket"];

const s3 = new AWS.S3();

const mapToUrl = ({ key = key, bucket, externalId = "" }) => {
  if (!bucket) {
    throw new Error('"bucket" is a required property');
  }

  if (!secret) {
    throw new Error(
      "You must specify a secret via the command line with --secret=<secret>"
    );
  }

  if (!host) {
    throw new Error(
      "You must specify a host via the command line with --host=<host>"
    );
  }

  const encoded = jwt.sign({ key, bucket }, args["secret"]);

  return { externalId, imageUrl: `${host}?token=${encoded}` };
};

const parseDataAndWriteToDest = (err, data, callback) => {
  if (err) {
    throw err;
  }

  const json = JSON.parse(data);
  const mappedJson = json.map(mapToUrl);

  fs.writeFile("cleaned-data.json", JSON.stringify(mappedJson), err => {
    if (err) {
      throw err;
    }

    console.log("The data has been saved");
  });
};

const generateKeyBucketPairs = async bucket => {
  const params = {
    Bucket: bucket,
    MaxKeys: 2
  };
  let content = [];
  const promise = new Promise((resolve, reject) => {
    s3.listObjectsV2(params).eachPage((err, data, done) => {
      if (err) {
        reject(err);
      }
      if (data) {
        content = [
          ...content,
          ...data.Contents.map(({ Key }) => ({
            key: Key,
            bucket,
            externalId: Key
          }))
        ];
      }
      if (data === null) {
        resolve(content);
      }
      done();
    });
  });

  return await promise;
};

const writeToDest = (err, data) => {
  if (err) {
    throw err;
  }

  if (input) {
    fs.readFile("example.json", parseDataAndWriteToDest);
  } else {
    console.log(
      "This means no input file was given and we need to generate keys"
    );
  }
};

generateKeyBucketPairs("labelbox-example-proxy")
  .then(data => {
    console.log(data);
    return data;
  })
  .then(() => console.log("done"));

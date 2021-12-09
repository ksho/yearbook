import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
// import aws from 'aws-sdk';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const dirRelativeToPublicFolder = 'images/photos/2021';

  const dir = path.resolve('./public', dirRelativeToPublicFolder);

  // const dir = path.resolve('./public/images/photos/2021');

  const filenames = fs.readdirSync(dir);

  const images = filenames.map(name => path.join('/', dirRelativeToPublicFolder, name))

  // aws.config.update({
  //   accessKeyId: process.env.AWS_S3_ACCESS_KEY,
  //   secretAccessKey: process.env.AWS_S3_SECRET,
  //   region: 'us-east-1',
  //   signatureVersion: 'v4',
  // });

  // const s3 = new aws.S3();

  // // The id from the route (e.g. /img/abc123987)
  // // let filename = query.id;

  // const params = {
  //   Bucket: 'ksho-share',
  //   Prefix: '2021',
  //   // Key: 'test.jpg'
  // };

  // const lala = new Promise((resolve, reject) => {
  //   s3.listObjectsV2(params, (err, data) => {
  //     if (err) reject(err);
  //     console.log(data);
  //     const keys = data.Contents?.map((c) => c.Key) || []
  //     keys.shift();
  //     // let imgData = 'data:image/jpeg;base64,' + data.Body.toString('base64');
  //     resolve(keys);
  //   });
  // });

  res.statusCode = 200
  res.json(images);
}
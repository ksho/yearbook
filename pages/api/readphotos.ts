import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const dirRelativeToPublicFolder = 'images/photos/2021';

  const dir = path.resolve('./public', dirRelativeToPublicFolder);

  // const dir = path.resolve('./public/images/photos/2021');

  const filenames = fs.readdirSync(dir);

  const images = filenames.map(name => path.join('/', dirRelativeToPublicFolder, name))

  res.statusCode = 200
  res.json(images);
}
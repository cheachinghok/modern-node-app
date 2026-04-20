import { Readable } from 'stream';
import drive from '../config/googleDrive.js';
import logger from '../utils/logger.js';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

export const uploadFileToDrive = async (file) => {
  const { originalname, mimetype, buffer } = file;

  // Convert buffer to readable stream
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  // Upload file to Google Drive
  const response = await drive.files.create({
    requestBody: {
      name: `${Date.now()}-${originalname}`,
      mimeType: mimetype,
      parents: [FOLDER_ID],
    },
    media: {
      mimeType: mimetype,
      body: stream,
    },
    fields: 'id',
  });

  const fileId = response.data.id;

  // Make file publicly accessible
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
  logger.info(`Uploaded file to Google Drive: ${publicUrl}`);

  return publicUrl;
};

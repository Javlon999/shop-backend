import { S3Event } from "aws-lambda";
import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import csvParser from "csv-parser";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.BUCKET_NAME as string;

export const handler = async (event: S3Event): Promise<void> => {
  console.log("importFileParser lambda invoked", JSON.stringify(event));

  for (const record of event.Records) {
    const key = record.s3.object.key;

    console.log(`Processing file: ${key}`);

    try {
      // Get the file from S3
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(getCommand);

      if (!response.Body) {
        console.error("No body in response");
        continue;
      }

      // Parse CSV
      const stream = response.Body as Readable;

      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(csvParser())
          .on("data", (data: Record<string, string>) => {
            console.log("Parsed record:", JSON.stringify(data));
          })
          .on("end", () => {
            console.log(`Finished parsing file: ${key}`);
            resolve();
          })
          .on("error", (error: Error) => {
            console.error("Error parsing CSV:", error);
            reject(error);
          });
      });

      // Optional: Move file from uploaded/ to parsed/
      const newKey = key.replace("uploaded/", "parsed/");

      // Copy to parsed/
      await s3Client.send(
        new CopyObjectCommand({
          Bucket: BUCKET_NAME,
          CopySource: `${BUCKET_NAME}/${key}`,
          Key: newKey,
        })
      );

      // Delete from uploaded/
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        })
      );

      console.log(`File moved from ${key} to ${newKey}`);
    } catch (error) {
      console.error(`Error processing file ${key}:`, error);
      throw error;
    }
  }
};
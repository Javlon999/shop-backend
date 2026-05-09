import { S3Event } from "aws-lambda";
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { Readable } from "stream";
import csv from "csv-parser";

const s3Client = new S3Client({ region: "ap-southeast-2" });
const sqsClient = new SQSClient({ region: "ap-southeast-2" });

export const handler = async (event: S3Event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));

  console.log(`Processing file: ${key} from bucket: ${bucket}`);

  const getObjectCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(getObjectCommand);
  const stream = response.Body as Readable;

  await new Promise<void>((resolve, reject) => {
    stream
      .pipe(csv())
      .on("data", async (record) => {
        console.log("Sending record to SQS:", record);

        await sqsClient.send(
          new SendMessageCommand({
            QueueUrl: process.env.CATALOG_ITEMS_QUEUE_URL,
            MessageBody: JSON.stringify(record),
          })
        );
      })
      .on("end", resolve)
      .on("error", reject);
  });

  // Move file from uploaded/ to parsed/
  const parsedKey = key.replace("uploaded/", "parsed/");

  await s3Client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${key}`,
      Key: parsedKey,
    })
  );

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  console.log(`File moved from ${key} to ${parsedKey}`);
};

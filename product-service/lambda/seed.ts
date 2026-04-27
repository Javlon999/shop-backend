import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);

const products = [
  {
    id: uuidv4(),
    title: "Product One",
    description: "Short Product Description 1",
    price: 24,
  },
  {
    id: uuidv4(),
    title: "Product Two",
    description: "Short Product Description 2",
    price: 15,
  },
  {
    id: uuidv4(),
    title: "Product Three",
    description: "Short Product Description 3",
    price: 49,
  },
  {
    id: uuidv4(),
    title: "Product Four",
    description: "Short Product Description 4",
    price: 9,
  },
  {
    id: uuidv4(),
    title: "Product Five",
    description: "Short Product Description 5",
    price: 34,
  },
  {
    id: uuidv4(),
    title: "Product Six",
    description: "Short Product Description 6",
    price: 19,
  },
];

const seedData = async () => {
  for (const product of products) {
    // Insert into products table
    await docClient.send(
      new PutCommand({
        TableName: "products",
        Item: {
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.price,
        },
      })
    );

    // Insert into stock table
    await docClient.send(
      new PutCommand({
        TableName: "stock",
        Item: {
          product_id: product.id,
          count: Math.floor(Math.random() * 20) + 1,
        },
      })
    );

    console.log(`Inserted product: ${product.title}`);
  }

  console.log("Seed data complete!");
};

seedData().catch(console.error);
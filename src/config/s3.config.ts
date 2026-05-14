import { registerAs } from "@nestjs/config";
import { S3ClientConfig } from "@aws-sdk/client-s3";

export default registerAs(
  "s3",
  (): S3ClientConfig => ({
    region: process.env.AWS_REGION || "eu-west-2",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  }),
);

export const s3BucketConfig = () => ({
  bucket: process.env.AWS_S3_BUCKET || "justizia-documents",
});

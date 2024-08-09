# Storage (Uploads)
There are two different supported storage methods available to handle uploading assets for templates: 
- Local
- S3

## Local
This is the default storage method and no configuration is required. It will by default serve imagery from your base URL.

## S3
The S3 storage method allows for configuring any S3-compatible object storage service such as AWS S3, [Digital Ocean Spaces](https://docs.digitalocean.com/products/spaces/how-to/use-aws-sdks/#:~:text=To%20use%20Spaces%20with%20tools,where%20your%20bucket%20is%20located.), Minio, etc.

Under the hood it is utilizing the AWS S3 SDK so please consult whatever service you are using as to what values should be used in what places.

The URL that is generated for referencing each image can be overriden using the `STORAGE_BASE_URL` key.

### Configuration
| Key | Type | Required | Default | Details
|--|--|--|--|--|
| STORAGE_DRIVER | s3 | true |
| STORAGE_BASE_URL | string | true || Override the base path used for image URLs
| STORAGE_S3_BUCKET | string | true || The name of your bucket
| STORAGE_S3_ENDPOINT | string | false || If using a service other than AWS S3, the endpoint for the object storage
| STORAGE_S3_FORCE_PATH_STYLE | boolean | false | false | Enable if using a service other than AWS S3
| AWS_REGION | string | false | us-east-1 | The region your bucket is in
| AWS_ACCESS_KEY_ID | string | true |
| AWS_SECRET_ACCESS_KEY | string | true |

### Usage With Other S3-Compatible Services
If you want to utilize a S3-compatible object storage service other than S3 you will need to configure a few additional parameters to ensure the AWS defaults are not being used:
- `STORAGE_S3_FORCE_PATH_STYLE`: Set this to `true`
- `STORAGE_S3_ENDPOINT`: Enter the base URL provided by the service you are using.

### Use with CDN
If you are utilizing a CDN in front of your bucket, you can set the URL of the CDN to be used for all images by utilizing the `STORAGE_BASE_URL` parameter. Utilizing this parameter will rewrite all image URLs to use that as the base url instead of the S3 endpoint.
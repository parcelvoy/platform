# API Keys
To ingest data into Parcelvoy via the client libraries or modify data via admin endpoints you first need to create an API Key. Each key is bound to a given project and only allows for interacting with data in that project.

Parcelvoy has two different kinds of API keys, each with a particular purpose:
- **Public**: These are keys to be used in client libraries and allow for ingestion only. They are intended to be used in environments where they key could be exposed publically.
- **Secret**: These allow for accessing data via the admin APIs. These keys can perform destructive actions as well as create new campaigns, trigger sends, etc. Secret keys also allow for setting a Role similar to restrict access similar to how you can with admins.

### Create an API Key
To create an API key, navigate to `Settings -> API Keys` and click the `Create Key` button in the top right corner.

![Create API Key](/img/api_keys_create_modal.png)

In the dialog that opens, provide a name for the key as well as a scope based on what you are trying to accomplish then hit `Create`. The new key will be available to be copied from the table after creation.

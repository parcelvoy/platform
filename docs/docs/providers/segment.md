# Segment
Parcelvoy currently supports both ingesting events from Segment and sending events to Segment. Follow the instructions for each below.

## Outbound
To setup Parcelvoy as a source for events going into Segment, you first need to create a Source in Segment. 
1. Open Segment and navigate to `Connections -> Sources` and click `Add Source`
2. Search for `Node.js` and select that server source to be added
3. Pick whatever name you would like and hit `Add Source` to finish
4. The source screen should present you with a `Write Key` which is needed to setup the intergration on Parcelvoy. Copy this for later.
5. Navigate to Parcelvoy and go to `Settings -> Integrations`
6. Hit `Add Integration` and pick Segment
7. Enter the `Write Key` for the Segment Source you previously created and hit save.
8. That's it! After you save the integration all future events will flow into the source you created.

## Inbound
There is currently no Destination in Segment for Parcelvoy, however Parcelvoy does have a Segment compatible endpoint that can be used for webhooks. 

1. Open Parcelvoy and go to `Settings -> API Keys`
2. Hit `Create Key`, enter `Segment` (or whatever you want) as the name, `Public` as the scope and then hit create.
3. Copy the key so you have it for later
4. Open Segment and navigate to `Connections -> Destinations` and click `Add Destination`
5. Search for `Webhooks` and pick the Destination title `Webhooks (Actions)`
6. Hit `Configure Webhooks (Actions)` in the top right of the next screen
7. Select whatever data source you want to ingest data from and hit Next
8. Enter a name and then hit `Select destination`
9. Create a new Mapping of type `Send` 
10. For the first section, pick `Event Type` as the condition and `Track` as the event type. Parcelvoy supports `Track`, `Identify` and `Alias` events, so select all three as separate conditions to receive all data.
11. Under mappings, enter the following information:
    - **URL**: Enter your domain along with the path `/api/client/segment` (i.e. `https://test.com/api/client/segment`)
    - **Method**: POST
    - **Headers**: Set the key as `Authorization` and the value to `Bearer API_KEY` where `API_KEY` is the key you created in Parcelvoy
    - **Data**: Leave as is
    - **Enable Batching**: Set to true
12. Save the destination and enable to start sending events into Parcelvoy!.
# Image Attachments (View Once)

- `[x]` Update `Message.js` schema with `attachment` (String) and `viewed` (Boolean)
- `[x]` Update `server.js` to encrypt/decrypt `attachment` and save it to MongoDB
- `[x]` Update `server.js` with a new socket event `mark_viewed` that deletes the encrypted attachment from the database and sets `viewed = true`.
- `[x]` Update `MessageInput.jsx` with a hidden file input to select images, preview them, and convert them to Base64 (max 5MB).
- `[x]` Update `EncryptedMessage.jsx` to render the image inside the X-Ray lens.
- `[x]` Update `EncryptedMessage.jsx` to fire the `mark_viewed` event as soon as the user releases the `SHIFT` key, permanently deleting the image.

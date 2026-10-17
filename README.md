# KRUSH — Hosted Test Build

This folder is a real, standalone website version of KRUSH, built from the same app code as
your Claude artifact. It is not a rewrite — `src/App.jsx` is your existing prototype, unchanged
in design, branding, navigation, competition rules, and features. Only the storage layer was
swapped (see `src/storageShim.js`) so it talks to a real hosted database instead of the
artifact's sandboxed storage, and video uploads can actually reach Cloudinary because this
version isn't running inside the artifact's restricted network environment.

Your original Claude artifact is untouched and still works as your backup.

See the step-by-step deployment guide in chat — this file is the technical reference copy.

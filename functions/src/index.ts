import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https"; // Correct import

admin.initializeApp();

interface MakeAdminRequest {
  uid: string;
}

export const makeAdmin = functions.https.onCall(
  async (request: CallableRequest<MakeAdminRequest>): Promise<{ success: boolean }> => {
    // Validate authentication
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    const requesterUid = request.auth.uid;
    const requesterDoc = await admin.firestore().doc(`users/${requesterUid}`).get();

    // Type-safe document data check
    const requesterData = requesterDoc.data() as { roles?: { admin?: boolean } } | undefined;
    if (!requesterData?.roles?.admin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Requires admin privileges"
      );
    }

    // Validate target UID exists in request
    if (!request.data.uid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing user ID"
      );
    }

    await admin.firestore().doc(`users/${request.data.uid}`).update({
      "roles.admin": true
    });

    return { success: true };
  }
);

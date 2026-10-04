export type FacebookCredential =
  | { tokenType: "access_token"; accessToken: string; idToken?: never; nonce?: never }
  | { tokenType: "id_token"; idToken: string; nonce: string; accessToken?: never };

export type FacebookLoginResult =
  | ({ success: true } & FacebookCredential)
  | { success: false; cancelled?: boolean; error?: string };

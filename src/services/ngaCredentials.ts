export interface NgaCredentials {
  uid: string;
  cid: string;
}

function cleanLooseValue(input: string, name: string) {
  return input
    .trim()
    .replace(new RegExp(`^${name}=`, "i"), "")
    .split(";")[0]
    .trim();
}

export function normalizeNgaCredentials(uidInput: string | null, cidInput: string | null): NgaCredentials {
  const uidRaw = uidInput || "";
  const cidRaw = cidInput || "";

  return {
    uid: cleanLooseValue(uidRaw, "ngaPassportUid"),
    cid: cleanLooseValue(cidRaw, "ngaPassportCid"),
  };
}

export function readNgaCredentials(): NgaCredentials {
  const credentials = normalizeNgaCredentials(
    localStorage.getItem("nreader_uid"),
    localStorage.getItem("nreader_cid")
  );
  localStorage.removeItem("nreader_cookie");
  return credentials;
}

export function saveNgaCredentials(credentials: NgaCredentials) {
  localStorage.setItem("nreader_uid", credentials.uid);
  localStorage.setItem("nreader_cid", credentials.cid);
  localStorage.removeItem("nreader_cookie");
}

export function clearNgaCredentials() {
  localStorage.removeItem("nreader_uid");
  localStorage.removeItem("nreader_cid");
  localStorage.removeItem("nreader_cookie");
  localStorage.removeItem("nreader_auth_verified");
}

export function setNgaAuthVerified(verified: boolean) {
  localStorage.setItem("nreader_auth_verified", verified ? "true" : "false");
}

export function isNgaAuthVerified() {
  return localStorage.getItem("nreader_auth_verified") === "true";
}

export function buildNgaCookieHeader(uid: string, cid: string) {
  if (!uid || !cid) return "";
  return `ngaPassportUid=${uid}; ngaPassportCid=${cid};`;
}

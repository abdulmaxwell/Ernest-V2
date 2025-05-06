import { ownerNumber } from "../config.js";

export const isOwner = (jid) => jid.split("@")[0] === ownerNumber;

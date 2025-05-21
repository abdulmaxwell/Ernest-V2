import handler from '../lib/supHandler.js';

export default async function sup(sock, m, args, commandInfo) {
  await handler(sock, m);
}

export const description = "Get support contact details for Ernest Tech House.";
export const category = "utility";

// Attach metadata to the function itself
sup.description = description;
sup.category = category;

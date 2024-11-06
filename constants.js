export const DEFUAULT_BEE_API_URL = "http://localhost:1633";
export const ASSETS_PATH = "./assets/";
export const FEEDTYPE_SEQUENCE = "sequence";
export const DUMMY_STAMP =
  "f07a4b8b5a502edbf36cc1a4859b1ea54c0c6890068fb3bb80c681943f1f625d";
export const DEVCON_7_DAYS_MAP = new Map([
  ["Day 1", new Date("2024-11-12").toDateString()],
  ["Day 2", new Date("2024-11-13").toDateString()],
  ["Day 3", new Date("2024-11-14").toDateString()],
  ["Day 4", new Date("2024-11-15").toDateString()],
]);
export const DAYS_KEY_ARRAY = Array.from(DEVCON_7_DAYS_MAP.keys());
export const FEED_OWNER_ADDRESS = "6d6d50A17e0F4a28c74b6e4D4e83691077149bB9";
export const FEED_TOPIC = "sessions";
export const VERSION_API_URL = "https://api.devcon.org/events/devcon-7/version";
export const SESSIONS_API_URL =
  "https://api.devcon.org/sessions?size=600&sort=slot_start&order=asc&event=devcon-7";

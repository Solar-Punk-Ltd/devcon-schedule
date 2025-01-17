export const DEFUAULT_BEE_API_URL = "http://localhost:1633";
export const ASSETS_PATH = "./assets/";
export const FEEDTYPE_SEQUENCE = "sequence";
export const DUMMY_STAMP =
  "8dad205ca875acffc42ec9c7b80122c71c911b220a0bd586f95687db6c86922e";
export const DEVCON_7_DAYS_MAP = new Map([
  ["Day 1", new Date("2024-11-12").toDateString()],
  ["Day 2", new Date("2024-11-13").toDateString()],
  ["Day 3", new Date("2024-11-14").toDateString()],
  ["Day 4", new Date("2024-11-15").toDateString()],
]);
export const DAYS_KEY_ARRAY = Array.from(DEVCON_7_DAYS_MAP.keys());
export const FEED_OWNER_ADDRESS = "f4ba07294929857359929d55bec87fc869487c73";
export const FEED_TOPIC = "sessions";
export const VERSION_API_URL = "https://api.devcon.org/events/devcon-7/version";
export const SESSIONS_API_URL =
  "https://api.devcon.org/sessions?size=600&sort=slot_start&order=asc&event=devcon-7";

import { readFile, writeFile } from "fs/promises";
import { Wallet } from "ethers";
import { Bee, Utils } from "@ethersphere/bee-js";
import schedule from "node-schedule";
import {
  DEFUAULT_BEE_API_URL,
  DUMMY_STAMP,
  FEEDTYPE_SEQUENCE,
  FEED_OWNER_ADDRESS,
  FEED_TOPIC,
  DAYS_KEY_ARRAY,
  DEVCON_7_DAYS_MAP,
  VERSION_API_URL,
  SESSIONS_API_URL,
  ASSETS_PATH,
} from "./constants.js";

const bee = new Bee(process.env.BEE_API_URL || DEFUAULT_BEE_API_URL);
const feedOwnerAddress = process.env.FEED_OWNER_ADDRESS || FEED_OWNER_ADDRESS;
const feedTopic = process.env.FEED_TOPIC || FEED_TOPIC;
const mainnet_stamp = process.env.STAMP || DUMMY_STAMP;
const mainnet_pk = process.env.MAINNET_PK || null;

async function initFeed(rawTopic, stamp) {
  try {
    const topic = bee.makeFeedTopic(rawTopic);
    const feedManif = await bee.createFeedManifest(
      stamp,
      FEEDTYPE_SEQUENCE,
      topic,
      feedOwnerAddress
    );
    console.log("created feed manifest", feedManif.reference);
    if (!mainnet_pk) {
      console.log("mainnet_pk is missing");
      return null;
    }
    const wallet = new Wallet(mainnet_pk);
    const signer = {
      address: Utils.hexToBytes(wallet.address.slice(2)),
      sign: async (data) => {
        return await wallet.signMessage(data);
      },
    };

    return bee.makeFeedWriter(FEEDTYPE_SEQUENCE, topic, signer);
  } catch (error) {
    console.log("error creating feed manifest", error);
    return null;
  }
}

async function uploadSessionsJSON(stamp, data) {
  try {
    console.log("uploading sessions json");
    const sessionsReference = await bee.uploadData(stamp, data);
    console.log("success, file reference: ", sessionsReference.reference);
    return sessionsReference.reference;
  } catch (error) {
    console.log("error file upload", error);
    return null;
  }
}

async function updateFeed(feedWriter, stamp, ref) {
  console.log("updating feed with the file reference: ", ref);
  try {
    const feedUpdateRes = await feedWriter.upload(stamp, ref);
    console.log("feed upload result: ", feedUpdateRes.reference);
    return feedUpdateRes.reference;
  } catch (error) {
    console.log("error feed update: ", error);
    return null;
  }
}

async function transformDataMaptoJSON(path, filename) {
  let sessionsFile;
  try {
    console.log("reading " + filename);
    sessionsFile = await readFile(path + filename);
  } catch (e) {
    console.log("error reading " + path + filename + " file", e);
    return null;
  }

  const sortedSessionsMap = new Map();
  for (let i = 0; i < DAYS_KEY_ARRAY.length; i++) {
    sortedSessionsMap.set(DAYS_KEY_ARRAY[i], new Array());
  }

  const items = JSON.parse(sessionsFile).data.items;
  const itemsWithoutAvatars = removeSpeakers(items);

  for (let i = 0; i < itemsWithoutAvatars.length; i++) {
    const slotStart = itemsWithoutAvatars[i].slot_start;
    if (slotStart) {
      const day = new Date(slotStart).toDateString();
      let dayIndex = -1;
      switch (day) {
        case DEVCON_7_DAYS_MAP.get("Day 1"):
          dayIndex = 0;
          break;
        case DEVCON_7_DAYS_MAP.get("Day 2"):
          dayIndex = 1;
          break;
        case DEVCON_7_DAYS_MAP.get("Day 3"):
          dayIndex = 2;
          break;
        case DEVCON_7_DAYS_MAP.get("Day 4"):
          dayIndex = 3;
          break;
        default:
          console.log("unkown day: ", day);
          break;
      }
      if (dayIndex !== -1) {
        sortedSessionsMap
          .get(DAYS_KEY_ARRAY[dayIndex])
          .push(itemsWithoutAvatars[i]);
      }
    }
  }

  sortedSessionsMap.forEach((value, key) => {
    console.log(key, " length: ", value.length);
    if (value.length == 0) {
      console.log("empty day: ", key);
      return null;
    }
  });

  return sortedSessionsMap;
}

async function uploadFeedAndData(path, filename) {
  let sessionsFile;
  try {
    console.log("reading " + filename);
    sessionsFile = await readFile(path + filename);
  } catch (e) {
    console.log("error reading " + filename + " file", e);
    return null;
  }

  const feedWriter = await initFeed(feedTopic, mainnet_stamp);
  if (feedWriter === null) {
    console.log("feedwriter is null");
    return null;
  }

  const sessionsReference = await uploadSessionsJSON(
    mainnet_stamp,
    sessionsFile
  );

  if (!sessionsReference || sessionsReference.length === 0) {
    console.log("canot update feed because of invalid reference");
    return null;
  }
  return await updateFeed(feedWriter, mainnet_stamp, sessionsReference);
}

function removeSpeakers(sessionItems) {
  const newSessionItems = sessionItems;
  for (let i = 0; i < newSessionItems.length; i++) {
    const item = newSessionItems[i];
    if (item.speakers) {
      item.speakers = [];
    }
  }

  return newSessionItems;
}

async function fetchDevconAPI(path, filename) {
  let currentVersion = "";
  try {
    console.log("reading " + filename);
    const versionFile = await readFile(path + filename);
    currentVersion = JSON.parse(versionFile).data;
  } catch (e) {
    console.log("error reading version file " + filename, e);
    return;
  }

  try {
    console.log("fetching API for version: ", VERSION_API_URL);
    const r = await fetch(VERSION_API_URL);
    const versionJSON = await r.json();
    // check if the version changed
    const newVersion = versionJSON.data;
    if (versionJSON.status === 200 && newVersion !== currentVersion) {
      console.log(`version changed from ${currentVersion} to ${newVersion}`);

      console.log("fetching API for sessions: ", SESSIONS_API_URL);
      const resp = await fetch(SESSIONS_API_URL);
      const sessionsJSON = await resp.json();
      const newSessionsFile =
        "all_devcon_7_sessions_asc_" + newVersion + ".json";

      // udpate the sessions file
      try {
        await writeFile(
          ASSETS_PATH + newSessionsFile,
          JSON.stringify(sessionsJSON, null, 2)
        );
        console.log("new sessions written to file: ", newSessionsFile);
      } catch (e) {
        console.log("error writing sessions file", e);
        return;
      }

      // udpate the version file only if the fetch was successful
      try {
        await writeFile(path + filename, JSON.stringify(versionJSON, null, 2));
        console.log("new version written to file: ", path + filename);
      } catch (e) {
        console.log("error writing version file", e);
        return;
      }

      const sortedSessionsMap = await transformDataMaptoJSON(
        ASSETS_PATH,
        newSessionsFile
      );

      if (sortedSessionsMap === null) {
        console.log("error transforming the data map to json");
        return;
      }
      const outputFile =
        "all_devcon_7_sessions_sorted_by_day_asc_" + newVersion + ".json";
      try {
        await writeFile(
          path + outputFile,
          JSON.stringify(Object.fromEntries(sortedSessionsMap), null, 2)
        );
        console.log("sortedSessionsMap written to file: ", outputFile);
      } catch (e) {
        console.log("error writing sortedSessionsMap file", e);
        return null;
      }

      const res = uploadFeedAndData(ASSETS_PATH, outputFile);
      if (res === null) {
        console.log("session data update fail, still using the old data");
      }
    } else {
      console.log("version did not change, current version: ", currentVersion);
    }
  } catch (e) {
    console.log("unexpected error during data fetch and update: ", e);
  }
  return;
}

async function scheduleSessionUpdateJob() {
  const jobName = "fetchDevconAPI";
  const updadtePeriod = 15;
  const cronSchedule = "* */" + updadtePeriod + " * * * *";
  schedule.scheduleJob(jobName, cronSchedule, async () => {
    console.log(
      "Scheduler job started at: " +
        new Date().toLocaleString() +
        " with period: " +
        updadtePeriod +
        " minutes (" +
        cronSchedule +
        ")"
    );
    await fetchDevconAPI(ASSETS_PATH, "version.json");
    console.log("Scheduler job ended at:", new Date().toLocaleString());
  });
}

async function main() {
  console.log("Fetch and update started at:", new Date().toLocaleString());
  scheduleSessionUpdateJob();
}

main();

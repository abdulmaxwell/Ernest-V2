import menu, { description } from "../commands/menu.js";
import fonts from "../commands/fonts.js";
import tagall from "../commands/tagAll.js";
import info from "../commands/info.js";
import creator from "../commands/creator.js";
import ping from "../commands/ping.js";
import xenon from "../commands/xenon.js";
import joke from '../commands/joke.js';
import youtube from "../commands/youtube.js";
import ginfo from "../commands/ginfo.js";
import newgc from "../commands/newgc.js";
import join from "../commands/join.js";
import math from "../commands/math.js";
import define from "../commands/define.js";
import weather from "../commands/weather.js";

export const commandMap = {
  tagall: {
    description: "Tags all group members",
    execute: tagall,
  },
  menu: {
    description: "Shows all available commands",
    execute: menu,
  },
  fonts: {
    description: "shoes avilable types of fonts",
    execute: fonts,
  },
  info: {
    description: "shows the bot current stats and info",
    execute: info,
  },
  creator: {
    description: "shows the bot creater infomation",
    execute: creator,
  },
  ping: {
    description: "shows latency of the bot",
    execute: ping,
  },
  xenon: {
    description: "doenload videos from facebook",
    execute: xenon,
  },
  youtube: {
    description: "search youtube content",
    execute: youtube,
  },
  ginfo:{
    description:"get group info",
    execute:ginfo,
  },
  newgc:{
    description:"create a new group",
    execute:newgc,
  },
  join:{
    description:"join a group",
    execute:join,
  },
  math:{
    description: "do math",
    execute:math,
  },
  define:{
    description: "define words",
    execute: define,
  },
  joke:{
    description:"have fun",
    execute: joke,
  },
  weather:{
    description:"know the weather of many places",
    execute: weather,
  }

  // ... other commands
};

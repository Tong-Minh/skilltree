import { SKILLS } from "@/data/skills";
import { createIndex } from "./rules";
import { assertValidSkills } from "./validate";

assertValidSkills(SKILLS);

/** The validated, indexed skill content used by the app. */
export const INDEX = createIndex(SKILLS);

import { writable } from "svelte/store";
import { produce } from "immer";
import { nextLevelRequirement } from "./util";
import { levelUpSound } from "./sounds";

export enum Quest {
  first,
}

export enum Scene {
  cellar,
  tavern,
  shop,
}

export type QuestState = {
  status: "accepted" | "completed" | "inactive";
};

type State = {
  adventurerKps: number;
  cellarMessage: string;
  clickPower: number;
  energy: number;
  experience: number;
  hiredAdventurers: number;
  kills: number;
  level: number;
  maxEnergy: number;
  scene: Scene;
  schemaVersion: number;
  tavernMessage: string;
  quests: Record<Quest, QuestState>;
};

const initialState: () => State = () => ({
  adventurerKps: 1 / 6,
  cellarMessage: `The tavern cellar is dark and damp. You hear a faint dripping sound. You can't see anything, but you can feel a cold stone wall to your left and a wooden door to your right."`,
  clickPower: 1,
  energy: 50,
  experience: 0,
  hiredAdventurers: 0,
  kills: 0,
  level: 1,
  maxEnergy: 50,
  scene: Scene.tavern,
  schemaVersion: 1,
  tavernMessage: `Ahoy there, intrepid adventurer! Welcome to "The Rat's Nest," where the rodents roam as free as the laughter and spirits flow. I'm Gump, the friendly face behind the bar, and I couldn't help but notice your determined aura as you entered. Now, I don't mean to be a bother, but we've found ourselves in a bit of a, shall we say, "cheesy" situation. You see, our beloved tavern has become a haven for our rat friends, and we're in dire need of a hero to help us regain control of the situation. What do you say? Could you lend us a hand in ridding our quaint establishment of these furry freeloaders? In return, I promise you the finest mug of "Rat's Tail Ale" and a feast that'll have you grinning from ear to ear!`,
  quests: {
    [Quest.first]: {
      status: "inactive",
    },
  },
});

function createStore() {
  let storedState = {};
  try {
    storedState = JSON.parse(localStorage.getItem("state") || "{}");
  } catch {}
  const {
    subscribe,
    set,
    update: baseUpdate,
  } = writable({
    ...initialState(),
    ...storedState,
  });

  const update = (mutation: (state: State) => void): void => {
    baseUpdate((state) => {
      const newState = produce(state, (draft) => {
        mutation(draft);
        while (draft.experience >= nextLevelRequirement(draft.level)) {
          draft.experience -= nextLevelRequirement(draft.level);
          draft.level += 1;
          levelUpSound.play();
        }
      });
      localStorage.setItem("state", JSON.stringify(newState));
      return newState;
    });
  };

  return {
    subscribe,
    manualKill: () =>
      update((state) => {
        if (state.energy > 0) {
          state.kills += state.clickPower;
          state.energy -= 1;
          state.experience += 2;
        }
      }),
    adventurerKill: (dt: number) =>
      update((state) => {
        state.kills += state.hiredAdventurers * state.adventurerKps * dt;
      }),
    gotoTavern: () =>
      update((state) => {
        state.scene = Scene.tavern;
      }),
    gotoCellar: () =>
      update((state) => {
        state.scene = Scene.cellar;
      }),
    gotoShop: () => update((state) => ({ ...state, scene: Scene.shop })),
    hireAdventurers: (count: number) =>
      update((state) => {
        state.hiredAdventurers += count;
      }),
    acceptQuest: (quest: Quest) =>
      update((state) => {
        state.quests[quest].status = "accepted";
      }),
    rest: () =>
      update((state) => {
        state.energy = state.maxEnergy;
      }),
    reset: () => set(initialState()),
    levelUp: () =>
      update((state) => {
        state.experience -= nextLevelRequirement(state.level);
        state.level += 1;
      }),
  };
}

export const store = createStore();

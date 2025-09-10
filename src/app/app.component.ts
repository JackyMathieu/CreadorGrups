import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';

export interface Person {
  id: number;
  name: string;
  sex: 'boy' | 'girl';
  isSpecial: boolean;
  hasActitudinalProblems: boolean;
  knowledgeLevel: 1 | 2 | 3 | 4;
  preferredCompanions: string[];
}

export interface SummaryStat {
  group1: number;
  group2: number;
  balance: number;
}

export interface SummaryData {
  people: SummaryStat;
  boys: SummaryStat;
  girls: SummaryStat;
  specialNeeds: SummaryStat;
  actitudinalProblems: SummaryStat;
  knowledgeSum: SummaryStat;
  metPreferences: SummaryStat;
}

const INITIAL_PEOPLE: Person[] = [
  {
    id: 1,
    name: 'Alice',
    sex: 'girl',
    isSpecial: true,
    hasActitudinalProblems: false,
    knowledgeLevel: 3,
    preferredCompanions: ['Charlie', 'Eve'],
  },
  {
    id: 2,
    name: 'Bob',
    sex: 'boy',
    isSpecial: false,
    hasActitudinalProblems: true,
    knowledgeLevel: 2,
    preferredCompanions: ['David'],
  },
  {
    id: 3,
    name: 'Charlie',
    sex: 'boy',
    isSpecial: false,
    hasActitudinalProblems: false,
    knowledgeLevel: 4,
    preferredCompanions: ['Alice', 'Frank'],
  },
  {
    id: 4,
    name: 'Diana',
    sex: 'girl',
    isSpecial: false,
    hasActitudinalProblems: false,
    knowledgeLevel: 4,
    preferredCompanions: ['Grace'],
  },
  {
    id: 5,
    name: 'Eve',
    sex: 'girl',
    isSpecial: true,
    hasActitudinalProblems: true,
    knowledgeLevel: 1,
    preferredCompanions: ['Alice'],
  },
  {
    id: 6,
    name: 'Frank',
    sex: 'boy',
    isSpecial: false,
    hasActitudinalProblems: false,
    knowledgeLevel: 3,
    preferredCompanions: ['Charlie'],
  },
  {
    id: 7,
    name: 'Grace',
    sex: 'girl',
    isSpecial: false,
    hasActitudinalProblems: false,
    knowledgeLevel: 2,
    preferredCompanions: ['Diana', 'Heidi'],
  },
  {
    id: 8,
    name: 'Heidi',
    sex: 'girl',
    isSpecial: false,
    hasActitudinalProblems: true,
    knowledgeLevel: 1,
    preferredCompanions: [],
  },
  {
    id: 9,
    name: 'Ivan',
    sex: 'boy',
    isSpecial: true,
    hasActitudinalProblems: false,
    knowledgeLevel: 4,
    preferredCompanions: ['Bob'],
  },
  {
    id: 10,
    name: 'Judy',
    sex: 'girl',
    isSpecial: false,
    hasActitudinalProblems: false,
    knowledgeLevel: 3,
    preferredCompanions: ['Alice', 'Diana'],
  },
];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class AppComponent {
  people = signal<Person[]>(INITIAL_PEOPLE);
  group1 = signal<Person[]>([]);
  group2 = signal<Person[]>([]);
  isSorted = signal<boolean>(false);
  sortingError = signal<string | null>(null);
  unmetPreferencesInGroup1 = signal<Set<number>>(new Set());
  unmetPreferencesInGroup2 = signal<Set<number>>(new Set());
  sortingSummary = signal<SummaryData | null>(null);
  sortingNotes = signal<string[]>([]);

  // --- CRUD Properties ---
  private nextId = signal(Math.max(...INITIAL_PEOPLE.map((p) => p.id), 0) + 1);
  editingPersonId = signal<number | null>(null);

  // Form state signals
  name = signal('');
  sex = signal<'boy' | 'girl'>('boy');
  isSpecial = signal(false);
  hasActitudinalProblems = signal(false);
  knowledgeLevel = signal<1 | 2 | 3 | 4>(1);
  preferredCompanions = signal(''); // Comma-separated string

  // Computed signal to know if form is for editing
  isEditing = computed(() => this.editingPersonId() !== null);
  knowledgeLevels: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

  sortPeople(): void {
    this.reset();
    const currentPeople = this.people();
    const totalPeople = currentPeople.length;

    if (totalPeople < 2) {
      this.isSorted.set(true);
      this.group1.set(currentPeople);
      this.group2.set([]);
      this.recalculateSortedState(currentPeople, [], true, 0);
      return;
    }

    const group1Size = Math.floor(totalPeople / 2);
    const possibleGroup1s = this.combinations(currentPeople, group1Size);

    let bestPartition: { group1: Person[]; group2: Person[] } | null = null;
    let minImbalance = Infinity;

    for (const g1 of possibleGroup1s) {
      const g1Ids = new Set(g1.map((p) => p.id));
      const g2 = currentPeople.filter((p) => !g1Ids.has(p.id));

      const boysInG1 = g1.filter((p) => p.sex === 'boy').length;
      const boysInG2 = g2.filter((p) => p.sex === 'boy').length;
      const girlsInG1 = g1.length - boysInG1;
      const girlsInG2 = g2.length - boysInG2;
      const sexImbalance =
        Math.pow(boysInG1 - boysInG2, 2) + Math.pow(girlsInG1 - girlsInG2, 2);

      const specialInG1 = g1.reduce((sum, p) => sum + (p.isSpecial ? 1 : 0), 0);
      const specialInG2 = g2.reduce((sum, p) => sum + (p.isSpecial ? 1 : 0), 0);
      const specialImbalance = Math.pow(specialInG1 - specialInG2, 2);

      const problemsInG1 = g1.reduce(
        (sum, p) => sum + (p.hasActitudinalProblems ? 1 : 0),
        0
      );
      const problemsInG2 = g2.reduce(
        (sum, p) => sum + (p.hasActitudinalProblems ? 1 : 0),
        0
      );
      const problemsImbalance = Math.pow(problemsInG1 - problemsInG2, 2);

      const knowledgeInG1 = g1.reduce((sum, p) => sum + p.knowledgeLevel, 0);
      const knowledgeInG2 = g2.reduce((sum, p) => sum + p.knowledgeLevel, 0);
      const knowledgeImbalance = Math.pow(knowledgeInG1 - knowledgeInG2, 2);

      const metPreferencesInG1 = g1.filter((p) =>
        this.isPreferenceMet(p, g1)
      ).length;
      const metPreferencesInG2 = g2.filter((p) =>
        this.isPreferenceMet(p, g2)
      ).length;
      const totalMetPreferences = metPreferencesInG1 + metPreferencesInG2;
      const totalPossiblePreferences = currentPeople.filter(
        (p) => p.preferredCompanions.length > 0
      ).length;
      // We want to MINIMIZE the number of UNMET preferences, so we square the difference
      const preferenceImbalance = Math.pow(
        totalPossiblePreferences - totalMetPreferences,
        2
      );

      const totalImbalance =
        sexImbalance +
        specialImbalance +
        problemsImbalance +
        knowledgeImbalance +
        preferenceImbalance;

      if (totalImbalance < minImbalance) {
        minImbalance = totalImbalance;
        bestPartition = { group1: g1, group2: g2 };
      }
    }

    if (bestPartition) {
      const { group1: g1, group2: g2 } = bestPartition;

      this.group1.set(g1);
      this.group2.set(g2);
      this.recalculateSortedState(g1, g2, true, minImbalance);
      this.isSorted.set(true);
    } else {
      this.sortingError.set('An unexpected error occurred during sorting.');
    }
  }

  private recalculateSortedState(
    g1: Person[],
    g2: Person[],
    isInitialSort: boolean,
    minImbalance?: number
  ): void {
    this.unmetPreferencesInGroup1.set(
      new Set(g1.filter((p) => !this.isPreferenceMet(p, g1)).map((p) => p.id))
    );
    this.unmetPreferencesInGroup2.set(
      new Set(g2.filter((p) => !this.isPreferenceMet(p, g2)).map((p) => p.id))
    );
    this.generateSummary(g1, g2);

    const notes: string[] = [];
    if (isInitialSort) {
      if (minImbalance! > 0) {
        notes.push(
          'A perfectly balanced solution was not possible. This arrangement represents the best compromise found across all criteria.'
        );
      }
    } else {
      notes.push(
        'Groups have been manually adjusted from the initial optimal sort.'
      );
    }

    const allPeople = [...g1, ...g2];
    const unmetPeopleNames = allPeople
      .filter(
        (p) =>
          this.unmetPreferencesInGroup1().has(p.id) ||
          this.unmetPreferencesInGroup2().has(p.id)
      )
      .map((p) => p.name);

    if (unmetPeopleNames.length > 0) {
      const plural = unmetPeopleNames.length > 1 ? 's' : '';
      notes.push(
        `Trade-off: Could not place the following individual${plural} with a preferred companion: ${unmetPeopleNames.join(
          ', '
        )}.`
      );
    }

    this.sortingNotes.set(notes);
  }

  private generateSummary(g1: Person[], g2: Person[]): void {
    const boysInG1 = g1.filter((p) => p.sex === 'boy').length;
    const boysInG2 = g2.filter((p) => p.sex === 'boy').length;
    const girlsInG1 = g1.length - boysInG1;
    const girlsInG2 = g2.length - boysInG2;
    const specialInG1 = g1.reduce((sum, p) => sum + (p.isSpecial ? 1 : 0), 0);
    const specialInG2 = g2.reduce((sum, p) => sum + (p.isSpecial ? 1 : 0), 0);
    const problemsInG1 = g1.reduce(
      (sum, p) => sum + (p.hasActitudinalProblems ? 1 : 0),
      0
    );
    const problemsInG2 = g2.reduce(
      (sum, p) => sum + (p.hasActitudinalProblems ? 1 : 0),
      0
    );
    const knowledgeInG1 = g1.reduce((sum, p) => sum + p.knowledgeLevel, 0);
    const knowledgeInG2 = g2.reduce((sum, p) => sum + p.knowledgeLevel, 0);
    const metPreferencesInG1 = g1.filter((p) =>
      this.isPreferenceMet(p, g1)
    ).length;
    const metPreferencesInG2 = g2.filter((p) =>
      this.isPreferenceMet(p, g2)
    ).length;

    const summary: SummaryData = {
      people: {
        group1: g1.length,
        group2: g2.length,
        balance: Math.abs(g1.length - g2.length),
      },
      boys: {
        group1: boysInG1,
        group2: boysInG2,
        balance: Math.abs(boysInG1 - boysInG2),
      },
      girls: {
        group1: girlsInG1,
        group2: girlsInG2,
        balance: Math.abs(girlsInG1 - girlsInG2),
      },
      specialNeeds: {
        group1: specialInG1,
        group2: specialInG2,
        balance: Math.abs(specialInG1 - specialInG2),
      },
      actitudinalProblems: {
        group1: problemsInG1,
        group2: problemsInG2,
        balance: Math.abs(problemsInG1 - problemsInG2),
      },
      knowledgeSum: {
        group1: knowledgeInG1,
        group2: knowledgeInG2,
        balance: Math.abs(knowledgeInG1 - knowledgeInG2),
      },
      metPreferences: {
        group1: metPreferencesInG1,
        group2: metPreferencesInG2,
        balance: Math.abs(metPreferencesInG1 - metPreferencesInG2),
      },
    };
    this.sortingSummary.set(summary);
  }

  private isPreferenceMet(person: Person, group: Person[]): boolean {
    if (person.preferredCompanions.length === 0) return true;
    const groupNames = new Set(group.map((p) => p.name));
    return person.preferredCompanions.some((name) => groupNames.has(name));
  }

  private combinations<T>(source: T[], size: number): T[][] {
    if (size < 0 || size > source.length) return [];
    if (size === 0) return [[]];
    if (size === source.length) return [source];
    if (size > source.length / 2) {
      const complementSize = source.length - size;
      const complementCombs = this.combinations(source, complementSize);
      return complementCombs.map((comp) => {
        const compSet = new Set(comp);
        return source.filter((item) => !compSet.has(item));
      });
    }

    const result: T[][] = [];
    const indices = Array.from({ length: size }, (_, i) => i);
    while (true) {
      result.push(indices.map((i) => source[i]));
      let i = size - 1;
      while (i >= 0 && indices[i] === i + source.length - size) i--;
      if (i < 0) break;
      indices[i]++;
      for (let j = i + 1; j < size; j++) {
        indices[j] = indices[j - 1] + 1;
      }
    }
    return result;
  }

  reset(): void {
    this.group1.set([]);
    this.group2.set([]);
    this.isSorted.set(false);
    this.sortingError.set(null);
    this.unmetPreferencesInGroup1.set(new Set());
    this.unmetPreferencesInGroup2.set(new Set());
    this.sortingSummary.set(null);
    this.sortingNotes.set([]);
  }

  // --- CRUD Methods ---
  addOrUpdatePerson(): void {
    if (!this.name().trim()) return;
    const companions = this.preferredCompanions()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (this.isEditing()) {
      const idToUpdate = this.editingPersonId();
      this.people.update((people) =>
        people.map((p) =>
          p.id === idToUpdate
            ? {
                ...p,
                name: this.name(),
                sex: this.sex(),
                isSpecial: this.isSpecial(),
                hasActitudinalProblems: this.hasActitudinalProblems(),
                knowledgeLevel: this.knowledgeLevel(),
                preferredCompanions: companions,
              }
            : p
        )
      );
    } else {
      const newPerson: Person = {
        id: this.nextId(),
        name: this.name(),
        sex: this.sex(),
        isSpecial: this.isSpecial(),
        hasActitudinalProblems: this.hasActitudinalProblems(),
        knowledgeLevel: this.knowledgeLevel(),
        preferredCompanions: companions,
      };
      this.people.update((people) => [...people, newPerson]);
      this.nextId.update((id) => id + 1);
    }
    this.resetForm();
  }

  startEdit(person: Person): void {
    this.editingPersonId.set(person.id);
    this.name.set(person.name);
    this.sex.set(person.sex);
    this.isSpecial.set(person.isSpecial);
    this.hasActitudinalProblems.set(person.hasActitudinalProblems);
    this.knowledgeLevel.set(person.knowledgeLevel);
    this.preferredCompanions.set(person.preferredCompanions.join(', '));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  deletePerson(id: number): void {
    this.people.update((people) => people.filter((p) => p.id !== id));
    if (this.editingPersonId() === id) this.resetForm();
  }

  resetForm(): void {
    this.editingPersonId.set(null);
    this.name.set('');
    this.sex.set('boy');
    this.isSpecial.set(false);
    this.hasActitudinalProblems.set(false);
    this.knowledgeLevel.set(1);
    this.preferredCompanions.set('');
  }
}

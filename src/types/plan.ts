export interface PlanTask {
    id: number;
    parentId: number;
    title: string;
    description: string;
    ownerMode: 'PM' | 'Architect' | 'Code' | 'TestGen';
}

export interface PlanParent {
    id: number;
    title: string;
    description: string;
    ownerMode: 'PM';
}

export interface PlanTree {
    planId: string;
    parent: PlanParent;
    tasks: PlanTask[];
}
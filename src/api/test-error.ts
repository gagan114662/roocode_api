// This file contains the fixed version of the code

function calculateSum(numbers: number[]): number {
    let sum = numbers.reduce((acc, current) => acc + current, 0);
    return sum;
}

// Fixed: added parameter type
function multiply(a: number, b: number): number {
    return a * b;
}

// Fixed: correct interface implementation
interface User {
    id: number;
    name: string;
    email: string;
}

class UserImpl implements User {
    id: number;
    name: string;
    email: string; // Added missing property
    
    constructor(id: number, name: string, email: string = '') {
        this.id = id;
        this.name = name;
        this.email = email;
    }
}

export { calculateSum, multiply, UserImpl };
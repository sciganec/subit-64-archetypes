/**
 * SUBIT - Minimal Discrete Cosmogony
 * 6 bits = 64 archetypes = complete map of being
 */

class Archetype {
    // Encoding tables
    static WHO = { "10": "ME", "11": "WE", "01": "YOU", "00": "THEY" };
    static WHERE = { "10": "EAST", "11": "SOUTH", "01": "WEST", "00": "NORTH" };
    static WHEN = { "10": "SPRING", "11": "SUMMER", "01": "AUTUMN", "00": "WINTER" };
    
    // Reverse lookup
    static WHO_REV = Object.fromEntries(
        Object.entries(Archetype.WHO).map(([k, v]) => [v, k])
    );
    static WHERE_REV = Object.fromEntries(
        Object.entries(Archetype.WHERE).map(([k, v]) => [v, k])
    );
    static WHEN_REV = Object.fromEntries(
        Object.entries(Archetype.WHEN).map(([k, v]) => [v, k])
    );
    
    // Canonical names (to be loaded)
    static canon = {};
    
    static async loadCanon(path = 'data/archetypes.json') {
        const response = await fetch(path);
        const data = await response.json();
        data.archetypes.forEach(arch => {
            Archetype.canon[arch.code] = arch.name_en;
        });
    }
    
    constructor(who, where, when) {
        this.who = who;
        this.where = where;
        this.when = when;
        
        this.whoBits = Archetype.WHO_REV[who];
        this.whereBits = Archetype.WHERE_REV[where];
        this.whenBits = Archetype.WHEN_REV[when];
    }
    
    static fromBits(bits) {
        if (bits.length !== 6) {
            throw new Error("Bits must be 6 characters long");
        }
        
        const whoBits = bits.substring(0, 2);
        const whereBits = bits.substring(2, 4);
        const whenBits = bits.substring(4, 6);
        
        const who = Archetype.WHO[whoBits];
        const where = Archetype.WHERE[whereBits];
        const when = Archetype.WHEN[whenBits];
        
        return new Archetype(who, where, when);
    }
    
    static fromCode(code) {
        const bits = code.replace(/ /g, '');
        return Archetype.fromBits(bits);
    }
    
    bits() {
        return this.whoBits + this.whereBits + this.whenBits;
    }
    
    code() {
        return `${this.whoBits} ${this.whereBits} ${this.whenBits}`;
    }
    
    name() {
        return Archetype.canon[this.code()] || this.code();
    }
    
    xor(other) {
        if (!(other instanceof Archetype)) {
            throw new Error("Can only XOR with another Archetype");
        }
        
        let resultBits = '';
        for (let i = 0; i < 6; i++) {
            resultBits += (parseInt(this.bits()[i]) ^ parseInt(other.bits()[i])).toString();
        }
        
        return Archetype.fromBits(resultBits);
    }
    
    equals(other) {
        if (!(other instanceof Archetype)) return false;
        return this.bits() === other.bits();
    }
    
    toString() {
        const name = this.name();
        if (name !== this.code()) {
            return `${name} [${this.who}, ${this.where}, ${this.when}]`;
        }
        return `[${this.who}, ${this.where}, ${this.when}]`;
    }
}

/**
 * Alchemical transmutation of three states via XOR
 * Formula: state1 ⊕ state2 ⊕ state3
 */
function transmute(state1, state2, state3) {
    return state1.xor(state2).xor(state3);
}

class Transmutation {
    constructor(name, description, current, impulse, catalyst, result) {
        this.name = name;
        this.description = description;
        this.current = current;
        this.impulse = impulse;
        this.catalyst = catalyst;
        this.result = result;
    }
    
    verify() {
        const computed = transmute(this.current, this.impulse, this.catalyst);
        return computed.equals(this.result);
    }
    
    toString() {
        return `${this.name}:\n  ${this.current} ⊕ ${this.impulse} ⊕ ${this.catalyst} = ${this.result}`;
    }
}

// Predefined significant transmutations
const PHILOSOPHER_STONE = new Transmutation(
    "The Philosopher's Stone",
    "Personal longing transmutes into collective achievement",
    new Archetype("ME", "SOUTH", "WINTER"),
    new Archetype("THEY", "EAST", "SPRING"),
    new Archetype("YOU", "NORTH", "AUTUMN"),
    new Archetype("WE", "WEST", "SUMMER")
);

const HERO_JOURNEY = new Transmutation(
    "The Hero's Journey",
    "The innocent becomes the teacher through trials",
    new Archetype("ME", "EAST", "SPRING"),
    new Archetype("THEY", "WEST", "WINTER"),
    new Archetype("WE", "NORTH", "AUTUMN"),
    new Archetype("YOU", "SOUTH", "SUMMER")
);

const ALCHEMICAL_MARRIAGE = new Transmutation(
    "The Alchemical Marriage",
    "Union of opposites returns to the source",
    new Archetype("ME", "EAST", "SPRING"),
    new Archetype("YOU", "WEST", "AUTUMN"),
    new Archetype("WE", "SOUTH", "SUMMER"),
    new Archetype("THEY", "NORTH", "WINTER")
);

const CREATIVE_PROCESS = new Transmutation(
    "The Creative Process",
    "From stillness through inspiration to shared creation",
    new Archetype("ME", "NORTH", "WINTER"),
    new Archetype("THEY", "EAST", "SPRING"),
    new Archetype("YOU", "SOUTH", "SUMMER"),
    new Archetype("WE", "WEST", "AUTUMN")
);

const MASTER_FORMULAS = [
    PHILOSOPHER_STONE,
    HERO_JOURNEY,
    ALCHEMICAL_MARRIAGE,
    CREATIVE_PROCESS
];

function diagnose(who, where, when) {
    return new Archetype(who, where, when);
}

// Example usage
console.log("=".repeat(60));
console.log("SUBIT - Minimal Discrete Cosmogony");
console.log("=".repeat(60));

console.log("\n🔮 Testing Philosopher's Stone:");
console.log(PHILOSOPHER_STONE.toString());
console.log(`  Verified: ${PHILOSOPHER_STONE.verify()}`);

console.log("\n🧪 Testing XOR properties:");
const zero = new Archetype("THEY", "NORTH", "WINTER");
const pioneer = new Archetype("ME", "EAST", "SPRING");
const confessor = new Archetype("YOU", "WEST", "AUTUMN");

console.log(`  Zero ⊕ Pioneer = ${zero.xor(pioneer)}`);
console.log(`  Pioneer ⊕ Confessor = ${pioneer.xor(confessor)}`);
console.log(`  Pioneer ⊕ Pioneer = ${pioneer.xor(pioneer)} (should be Zero)`);

module.exports = {
    Archetype,
    transmute,
    Transmutation,
    PHILOSOPHER_STONE,
    HERO_JOURNEY,
    ALCHEMICAL_MARRIAGE,
    CREATIVE_PROCESS,
    MASTER_FORMULAS,
    diagnose
};

"""
SUBIT - Minimal Discrete Cosmogony
6 bits = 64 archetypes = complete map of being
"""

import json
from typing import Dict, List, Tuple, Optional


class Archetype:
    """Represents one of 64 SUBIT archetypes"""
    
    # Encoding tables
    WHO = {"10": "ME", "11": "WE", "01": "YOU", "00": "THEY"}
    WHERE = {"10": "EAST", "11": "SOUTH", "01": "WEST", "00": "NORTH"}
    WHEN = {"10": "SPRING", "11": "SUMMER", "01": "AUTUMN", "00": "WINTER"}
    
    # Reverse lookup
    WHO_REV = {v: k for k, v in WHO.items()}
    WHERE_REV = {v: k for k, v in WHERE.items()}
    WHEN_REV = {v: k for k, v in WHEN.items()}
    
    # Canonical names (loaded from JSON)
    _canon: Dict[str, str] = {}
    
    @classmethod
    def load_canon(cls, path: str = "data/archetypes.json"):
        """Load canonical names from JSON file"""
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for arch in data['archetypes']:
                cls._canon[arch['code']] = arch['name_en']
    
    def __init__(self, who: str, where: str, when: str):
        """
        Create archetype from named dimensions
        Example: Archetype("ME", "SOUTH", "WINTER")
        """
        self.who = who
        self.where = where
        self.when = when
        
        self.who_bits = self.WHO_REV[who]
        self.where_bits = self.WHERE_REV[where]
        self.when_bits = self.WHEN_REV[when]
        
    @classmethod
    def from_bits(cls, bits: str):
        """Create archetype from 6-bit string (e.g., "101100")"""
        if len(bits) != 6:
            raise ValueError("Bits must be 6 characters long")
            
        who_bits = bits[0:2]
        where_bits = bits[2:4]
        when_bits = bits[4:6]
        
        who = cls.WHO[who_bits]
        where = cls.WHERE[where_bits]
        when = cls.WHEN[when_bits]
        
        return cls(who, where, when)
    
    @classmethod
    def from_code(cls, code: str):
        """Create archetype from spaced code (e.g., "10 11 00")"""
        bits = code.replace(" ", "")
        return cls.from_bits(bits)
    
    def bits(self) -> str:
        """Return 6-bit representation"""
        return self.who_bits + self.where_bits + self.when_bits
    
    def code(self) -> str:
        """Return spaced code representation"""
        return f"{self.who_bits} {self.where_bits} {self.when_bits}"
    
    def name(self) -> str:
        """Return canonical name if available, else code"""
        return self._canon.get(self.code(), self.code())
    
    def __xor__(self, other: 'Archetype') -> 'Archetype':
        """XOR operation between two archetypes"""
        if not isinstance(other, Archetype):
            raise TypeError("Can only XOR with another Archetype")
        
        # XOR each bit
        result_bits = ""
        for i in range(6):
            result_bits += str(int(self.bits()[i]) ^ int(other.bits()[i]))
        
        return Archetype.from_bits(result_bits)
    
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Archetype):
            return False
        return self.bits() == other.bits()
    
    def __repr__(self) -> str:
        return f"[{self.who}, {self.where}, {self.when}]"
    
    def __str__(self) -> str:
        name = self.name()
        if name != self.code():
            return f"{name} {self}"
        return repr(self)


def transmute(state1: Archetype, state2: Archetype, state3: Archetype) -> Archetype:
    """
    Alchemical transmutation of three states via XOR
    
    Formula: state1 ⊕ state2 ⊕ state3
    """
    return state1 ^ state2 ^ state3


class Transmutation:
    """Represents a significant transmutation formula"""
    
    def __init__(self, name: str, description: str, 
                 current: Archetype, impulse: Archetype, 
                 catalyst: Archetype, result: Archetype):
        self.name = name
        self.description = description
        self.current = current
        self.impulse = impulse
        self.catalyst = catalyst
        self.result = result
        
    def verify(self) -> bool:
        """Verify that the formula holds"""
        return transmute(self.current, self.impulse, self.catalyst) == self.result
    
    def __repr__(self) -> str:
        return (f"{self.name}:\n"
                f"  {self.current} ⊕ {self.impulse} ⊕ {self.catalyst} = {self.result}")


# Predefined significant transmutations
PHILOSOPHER_STONE = Transmutation(
    name="The Philosopher's Stone",
    description="Personal longing transmutes into collective achievement",
    current=Archetype("ME", "SOUTH", "WINTER"),
    impulse=Archetype("THEY", "EAST", "SPRING"),
    catalyst=Archetype("YOU", "NORTH", "AUTUMN"),
    result=Archetype("WE", "WEST", "SUMMER")
)

HERO_JOURNEY = Transmutation(
    name="The Hero's Journey",
    description="The innocent becomes the teacher through trials",
    current=Archetype("ME", "EAST", "SPRING"),
    impulse=Archetype("THEY", "WEST", "WINTER"),
    catalyst=Archetype("WE", "NORTH", "AUTUMN"),
    result=Archetype("YOU", "SOUTH", "SUMMER")
)

ALCHEMICAL_MARRIAGE = Transmutation(
    name="The Alchemical Marriage",
    description="Union of opposites returns to the source",
    current=Archetype("ME", "EAST", "SPRING"),
    impulse=Archetype("YOU", "WEST", "AUTUMN"),
    catalyst=Archetype("WE", "SOUTH", "SUMMER"),
    result=Archetype("THEY", "NORTH", "WINTER")
)

CREATIVE_PROCESS = Transmutation(
    name="The Creative Process",
    description="From stillness through inspiration to shared creation",
    current=Archetype("ME", "NORTH", "WINTER"),
    impulse=Archetype("THEY", "EAST", "SPRING"),
    catalyst=Archetype("YOU", "SOUTH", "SUMMER"),
    result=Archetype("WE", "WEST", "AUTUMN")
)

MASTER_FORMULAS = [
    PHILOSOPHER_STONE,
    HERO_JOURNEY,
    ALCHEMICAL_MARRIAGE,
    CREATIVE_PROCESS
]


def diagnose(who: str, where: str, when: str) -> Archetype:
    """Quick diagnosis of current state"""
    return Archetype(who, where, when)


def suggest_transmutation(current: Archetype, target: Archetype) -> List[Tuple[Archetype, Archetype]]:
    """
    Find all impulse-catalyst pairs that transmute current to target
    Returns list of (impulse, catalyst) tuples
    """
    results = []
    # This is a placeholder - would need full matrix search
    # In practice, for any current C and target T:
    # We need I and K such that C ⊕ I ⊕ K = T
    # Which means I ⊕ K = C ⊕ T
    # So we need all pairs (I,K) with I ⊕ K = fixed value
    return results


if __name__ == "__main__":
    print("=" * 60)
    print("SUBIT - Minimal Discrete Cosmogony")
    print("=" * 60)
    
    # Test Philosopher's Stone
    print("\n🔮 Testing Philosopher's Stone:")
    print(PHILOSOPHER_STONE)
    print(f"  Verified: {PHILOSOPHER_STONE.verify()}")
    
    # Test XOR properties
    print("\n🧪 Testing XOR properties:")
    zero = Archetype("THEY", "NORTH", "WINTER")
    pioneer = Archetype("ME", "EAST", "SPRING")
    confessor = Archetype("YOU", "WEST", "AUTUMN")
    
    print(f"  Zero ⊕ Pioneer = {zero ^ pioneer}")
    print(f"  Pioneer ⊕ Confessor = {pioneer ^ confessor}")
    print(f"  Pioneer ⊕ Pioneer = {pioneer ^ pioneer} (should be Zero)")

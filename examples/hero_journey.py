#!/usr/bin/env python3
"""
Hero's Journey - A SUBIT Example Script

This script demonstrates the Hero's Journey transmutation using SUBIT archetypes.
It provides both a command-line interface and a narrative generator for storytelling.

Usage:
    python hero_journey.py --help
    python hero_journey.py --hero "Odysseus" --world "Ithaca"
    python hero_journey.py --interactive

"""

import argparse
import sys
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime


# =============================================================================
# SUBIT Core Classes (minimal implementation for standalone script)
# =============================================================================

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
    
    # Canonical names (partial for this script)
    NAMES = {
        "10 10 10": "Pioneer",
        "10 11 10": "Warrior",
        "10 11 00": "Steadfast",
        "11 01 11": "Council",
        "00 01 00": "Shadow",
        "11 00 01": "Shared Experience",
        "01 11 11": "Teacher",
        "00 10 10": "Ghost",
        "01 00 01": "Beloved",
        "00 10 11": "Spirit",
        "01 00 10": "Kindred",
        "00 10 01": "Voice",
        "01 00 11": "Friend",
    }
    
    def __init__(self, who: str, where: str, when: str):
        """
        Create archetype from named dimensions
        Example: Archetype("ME", "EAST", "SPRING")
        """
        self.who = who
        self.where = where
        self.when = when
        
        self.who_bits = self.WHO_REV[who]
        self.where_bits = self.WHERE_REV[where]
        self.when_bits = self.WHEN_REV[when]
        
    @classmethod
    def from_bits(cls, bits: str):
        """Create archetype from 6-bit string (e.g., "101010")"""
        if len(bits) != 6:
            raise ValueError(f"Bits must be 6 characters long, got {bits}")
        
        who_bits = bits[0:2]
        where_bits = bits[2:4]
        when_bits = bits[4:6]
        
        who = cls.WHO[who_bits]
        where = cls.WHERE[where_bits]
        when = cls.WHEN[when_bits]
        
        return cls(who, where, when)
    
    @classmethod
    def from_code(cls, code: str):
        """Create archetype from spaced code (e.g., "10 10 10")"""
        bits = code.replace(" ", "")
        return cls.from_bits(bits)
    
    def bits(self) -> str:
        """Return 6-bit representation"""
        return self.who_bits + self.where_bits + self.when_bits
    
    def code(self) -> str:
        """Return spaced code representation"""
        return f"{self.who_bits} {self.where_bits} {self.when_bits}"
    
    def name(self) -> str:
        """Return canonical name if available"""
        return self.NAMES.get(self.code(), f"Unknown[{self.code()}]")
    
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
        return f"{self.name()} {self}"


def transmute(state1: Archetype, state2: Archetype, state3: Archetype) -> Archetype:
    """
    Alchemical transmutation of three states via XOR
    
    Formula: state1 ⊕ state2 ⊕ state3
    """
    return state1 ^ state2 ^ state3


# =============================================================================
# Hero's Journey Specific Classes
# =============================================================================

@dataclass
class Hero:
    """Represents a hero on their journey"""
    name: str
    home: str
    initial_archetype: Archetype
    current_archetype: Archetype
    companions: List[str] = None
    trials: List[str] = None
    allies: List[str] = None
    
    def __post_init__(self):
        if self.companions is None:
            self.companions = []
        if self.trials is None:
            self.trials = []
        if self.allies is None:
            self.allies = []


class HeroJourney:
    """
    The Hero's Journey transmutation:
    
    Pioneer (10 10 10) 
    ⊕ Shadow (00 01 00) 
    ⊕ Shared Experience (11 00 01) 
    = Teacher (01 11 11)
    """
    
    # Core archetypes of the journey
    PIONEER = Archetype.from_code("10 10 10")      # The innocent hero
    SHADOW = Archetype.from_code("00 01 00")       # The challenge/darkness
    SHARED_EXPERIENCE = Archetype.from_code("11 00 01")  # Community wisdom
    TEACHER = Archetype.from_code("01 11 11")      # The wise guide
    
    # Stage archetypes
    STAGES = {
        "ordinary_world": Archetype.from_code("10 10 10"),      # Pioneer
        "call_to_adventure": Archetype.from_code("00 10 10"),   # Ghost
        "refusal": Archetype.from_code("10 10 00"),             # Hermit
        "meeting_mentor": Archetype.from_code("01 11 10"),      # Mentor
        "crossing_threshold": Archetype.from_code("10 11 10"),  # Warrior
        "tests_allies_enemies": Archetype.from_code("01 00 10"), # Kindred
        "approach": Archetype.from_code("10 11 00"),            # Steadfast
        "ordeal": Archetype.from_code("00 01 00"),              # Shadow
        "reward": Archetype.from_code("11 01 11"),              # Council
        "road_back": Archetype.from_code("11 00 01"),           # Shared Experience
        "resurrection": Archetype.from_code("11 11 11"),        # Conciliar
        "return": Archetype.from_code("01 11 11")               # Teacher
    }
    
    def __init__(self, hero_name: str = "The Hero", home: str = "the Ordinary World"):
        """Initialize a new Hero's Journey"""
        self.hero = Hero(
            name=hero_name,
            home=home,
            initial_archetype=self.PIONEER,
            current_archetype=self.PIONEER
        )
        self.current_stage = "ordinary_world"
        self.journal = []
        
    def log(self, message: str):
        """Add entry to journey journal"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.journal.append(f"[{timestamp}] {message}")
        
    def stage_archetype(self, stage: str = None) -> Archetype:
        """Get the archetype for a given stage"""
        if stage is None:
            stage = self.current_stage
        return self.STAGES.get(stage, self.PIONEER)
    
    def transmute_to_stage(self, target_stage: str) -> Tuple[bool, Optional[Archetype], Optional[Archetype]]:
        """
        Calculate the transmutation needed to reach target stage
        Returns (is_possible, impulse, catalyst)
        """
        current_arch = self.stage_archetype()
        target_arch = self.stage_archetype(target_stage)
        
        # Find impulse and catalyst such that current ⊕ impulse ⊕ catalyst = target
        # This means impulse ⊕ catalyst = current ⊕ target
        required = current_arch ^ target_arch
        
        # Known transmutation patterns for Hero's Journey
        patterns = {
            # From Pioneer to Warrior (crossing threshold)
            self.PIONEER.code(): [
                (self.SHADOW, self.SHARED_EXPERIENCE, "Confront your shadow with the wisdom of those who came before")
            ],
            # From Warrior to Steadfast (approach)
            self.STAGES["crossing_threshold"].code(): [
                (Archetype.from_code("00 10 10"), Archetype.from_code("01 00 01"), 
                 "Receive an unexpected sign through a beloved companion")
            ],
            # From Steadfast to Council (reward)
            self.STAGES["approach"].code(): [
                (Archetype.from_code("01 00 01"), Archetype.from_code("00 11 10"),
                 "Let love meet cosmic force to gain collective wisdom")
            ],
        }
        
        if current_arch.code() in patterns:
            for impulse, catalyst, desc in patterns[current_arch.code()]:
                if (impulse ^ catalyst) == required:
                    return True, impulse, catalyst
        
        # Generic fallback - any pair that XORs to required
        # (would need full archetype set for comprehensive search)
        return False, None, None
    
    def advance_stage(self) -> bool:
        """Move to the next stage of the journey"""
        stages = list(self.STAGES.keys())
        try:
            current_idx = stages.index(self.current_stage)
            if current_idx < len(stages) - 1:
                next_stage = stages[current_idx + 1]
                possible, impulse, catalyst = self.transmute_to_stage(next_stage)
                
                if possible:
                    self.log(f"Transmuting from {self.current_stage} to {next_stage}")
                    self.log(f"  Impulse: {impulse} — {impulse.name()}")
                    self.log(f"  Catalyst: {catalyst} — {catalyst.name()}")
                    self.current_stage = next_stage
                    self.hero.current_archetype = self.stage_archetype()
                    return True
                else:
                    self.log(f"Cannot transmute to {next_stage} — missing impulse or catalyst")
                    return False
            else:
                self.log("Journey complete!")
                return False
        except ValueError:
            self.log(f"Unknown stage: {self.current_stage}")
            return False
    
    def tell_story(self) -> str:
        """Generate a narrative of the Hero's Journey"""
        stages_desc = {
            "ordinary_world": f"{self.hero.name} lived in {self.hero.home}, an {self.PIONEER.name()} — innocent, unaware of the adventure ahead.",
            "call_to_adventure": f"Then came the {self.STAGES['call_to_adventure'].name()} — a mysterious sign that called {self.hero.name} to leave the familiar.",
            "refusal": f"But {self.hero.name} hesitated, becoming the {self.STAGES['refusal'].name()}, afraid of what lay beyond.",
            "meeting_mentor": f"A {self.STAGES['meeting_mentor'].name()} appeared, offering wisdom and guidance for the journey ahead.",
            "crossing_threshold": f"Armed with new knowledge, {self.hero.name} became a {self.STAGES['crossing_threshold'].name()}, crossing into the unknown.",
            "tests_allies_enemies": f"On the road, {self.hero.name} found {self.STAGES['tests_allies_enemies'].name()} spirits — allies who would prove essential.",
            "approach": f"As they approached the great challenge, {self.hero.name} grew {self.STAGES['approach'].name()}, enduring every trial.",
            "ordeal": f"Then came the supreme {self.STAGES['ordeal'].name()} — the darkest moment, where all seemed lost.",
            "reward": f"From the darkness, {self.hero.name} emerged with the {self.STAGES['reward'].name()} — wisdom hard-won.",
            "road_back": f"Carrying this {self.STAGES['road_back'].name()}, {self.hero.name} began the journey home.",
            "resurrection": f"One final test awaited — a {self.STAGES['resurrection'].name()} moment of transformation.",
            "return": f"At last, {self.hero.name} returned as a {self.STAGES['return'].name()}, bringing gifts of wisdom to {self.hero.home}."
        }
        
        story = []
        story.append("=" * 60)
        story.append(f"THE HERO'S JOURNEY OF {self.hero.name.upper()}")
        story.append("=" * 60)
        story.append("")
        
        for stage in self.STAGES.keys():
            if stage in stages_desc:
                story.append(stages_desc[stage])
                
        story.append("")
        story.append("=" * 60)
        story.append("THE TRANSMUTATION")
        story.append("=" * 60)
        story.append("")
        story.append(f"{self.PIONEER} (Pioneer)")
        story.append(f"   ⊕ {self.SHADOW} (Shadow)")
        story.append(f"   ⊕ {self.SHARED_EXPERIENCE} (Shared Experience)")
        story.append(f"   = {self.TEACHER} (Teacher)")
        story.append("")
        story.append(f"Verified: {transmute(self.PIONEER, self.SHADOW, self.SHARED_EXPERIENCE) == self.TEACHER}")
        
        return "\n".join(story)
    
    def print_journal(self):
        """Print the journey journal"""
        print("\n".join(self.journal))
    
    def print_status(self):
        """Print current journey status"""
        print("\n" + "=" * 40)
        print(f"HERO: {self.hero.name}")
        print(f"HOME: {self.hero.home}")
        print(f"CURRENT STAGE: {self.current_stage}")
        print(f"CURRENT ARCHETYPE: {self.hero.current_archetype}")
        print("=" * 40)


# =============================================================================
# Interactive Functions
# =============================================================================

def interactive_journey():
    """Run an interactive Hero's Journey session"""
    print("\n" + "=" * 60)
    print("🌟 INTERACTIVE HERO'S JOURNEY")
    print("=" * 60)
    
    # Get hero details
    print("\nLet's create your hero...")
    name = input("Hero's name: ").strip() or "The Hero"
    home = input("Hero's home/world: ").strip() or "the Ordinary World"
    
    journey = HeroJourney(name, home)
    
    print(f"\n✨ Welcome, {name}! Your journey begins in {home}.")
    print("\nYou are currently in the Ordinary World, as the Pioneer archetype.")
    
    while True:
        print("\n" + "-" * 40)
        print(f"Current stage: {journey.current_stage}")
        print(f"Current archetype: {journey.hero.current_archetype.name()}")
        print("-" * 40)
        print("\nOptions:")
        print("  1. Advance to next stage")
        print("  2. Show story so far")
        print("  3. Show journey journal")
        print("  4. Show transmutation formula")
        print("  5. Exit")
        
        choice = input("\nYour choice (1-5): ").strip()
        
        if choice == "1":
            success = journey.advance_stage()
            if not success:
                print("\n❌ Cannot advance. Perhaps you need to find the right impulse and catalyst?")
                print("   (In a real journey, these would appear through experience.)")
        elif choice == "2":
            print("\n" + journey.tell_story())
        elif choice == "3":
            print("\n📖 JOURNEY JOURNAL")
            journey.print_journal()
        elif choice == "4":
            print("\n🔮 THE HERO'S JOURNEY FORMULA")
            print(f"{journey.PIONEER} (Pioneer)")
            print(f"   ⊕ {journey.SHADOW} (Shadow)")
            print(f"   ⊕ {journey.SHARED_EXPERIENCE} (Shared Experience)")
            print(f"   = {journey.TEACHER} (Teacher)")
        elif choice == "5":
            print("\nMay your journey be transformative. Farewell, hero!")
            break
        else:
            print("Invalid choice. Please enter 1-5.")


# =============================================================================
# Story Generation Functions
# =============================================================================

def generate_story(hero_name: str, home: str, output_file: str = None):
    """Generate a complete Hero's Journey story"""
    journey = HeroJourney(hero_name, home)
    story = journey.tell_story()
    
    print(story)
    
    if output_file:
        with open(output_file, 'w') as f:
            f.write(story)
        print(f"\n✅ Story saved to {output_file}")
    
    return story


def generate_chapter_outlines(hero_name: str, home: str) -> Dict[str, str]:
    """Generate chapter outlines for the Hero's Journey"""
    journey = HeroJourney(hero_name, home)
    
    outlines = {
        "chapter_1": f"The {journey.PIONEER.name()} of {home}",
        "chapter_2": f"The {journey.STAGES['call_to_adventure'].name()} Appears",
        "chapter_3": f"{journey.hero.name}'s {journey.STAGES['refusal'].name()}",
        "chapter_4": f"Meeting the {journey.STAGES['meeting_mentor'].name()}",
        "chapter_5": f"Crossing the Threshold as {journey.STAGES['crossing_threshold'].name()}",
        "chapter_6": f"{journey.STAGES['tests_allies_enemies'].name()} Spirits",
        "chapter_7": f"The {journey.STAGES['approach'].name()} Approach",
        "chapter_8": f"The {journey.STAGES['ordeal'].name()}",
        "chapter_9": f"The {journey.STAGES['reward'].name()}",
        "chapter_10": f"The {journey.STAGES['road_back'].name()}",
        "chapter_11": f"The {journey.STAGES['resurrection'].name()}",
        "chapter_12": f"The {journey.STAGES['return'].name()} Returns"
    }
    
    return outlines


# =============================================================================
# Command Line Interface
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Hero's Journey - A SUBIT Example Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python hero_journey.py --hero "Odysseus" --world "Ithaca"
  python hero_journey.py --hero "Frodo" --world "the Shire" --output frodo_story.txt
  python hero_journey.py --interactive
  python hero_journey.py --outlines --hero "Simba" --world "Pride Lands"
        """
    )
    
    parser.add_argument(
        "--hero", "-H",
        type=str,
        help="Name of the hero"
    )
    
    parser.add_argument(
        "--world", "-W",
        type=str,
        default="the Ordinary World",
        help="Hero's home/world"
    )
    
    parser.add_argument(
        "--interactive", "-i",
        action="store_true",
        help="Run in interactive mode"
    )
    
    parser.add_argument(
        "--output", "-o",
        type=str,
        help="Output file for generated story"
    )
    
    parser.add_argument(
        "--outlines", "-l",
        action="store_true",
        help="Generate chapter outlines instead of full story"
    )
    
    parser.add_argument(
        "--formula", "-f",
        action="store_true",
        help="Show the Hero's Journey transmutation formula"
    )
    
    parser.add_argument(
        "--verify", "-v",
        action="store_true",
        help="Verify the Hero's Journey transmutation"
    )
    
    args = parser.parse_args()
    
    # Show formula if requested
    if args.formula:
        journey = HeroJourney("Hero", "World")
        print("\n🔮 THE HERO'S JOURNEY FORMULA")
        print("=" * 40)
        print(f"{journey.PIONEER} (Pioneer)")
        print(f"   ⊕ {journey.SHADOW} (Shadow)")
        print(f"   ⊕ {journey.SHARED_EXPERIENCE} (Shared Experience)")
        print(f"   = {journey.TEACHER} (Teacher)")
        return
    
    # Verify the transmutation
    if args.verify:
        journey = HeroJourney("Hero", "World")
        result = transmute(journey.PIONEER, journey.SHADOW, journey.SHARED_EXPERIENCE)
        print(f"\n{'='*40}")
        print(f"VERIFYING HERO'S JOURNEY TRANSMUTATION")
        print(f"{'='*40}")
        print(f"{journey.PIONEER} ⊕ {journey.SHADOW} ⊕ {journey.SHARED_EXPERIENCE} = {result}")
        print(f"Expected: {journey.TEACHER}")
        print(f"Verified: {result == journey.TEACHER}")
        return
    
    # Interactive mode
    if args.interactive:
        interactive_journey()
        return
    
    # Generate outlines
    if args.outlines:
        if not args.hero:
            print("❌ Please provide a hero name with --hero")
            return
        outlines = generate_chapter_outlines(args.hero, args.world)
        print(f"\n📖 {args.hero.upper()}'S JOURNEY - CHAPTER OUTLINES")
        print("=" * 60)
        for chapter, title in outlines.items():
            print(f"{chapter.replace('_', ' ').title()}: {title}")
        return
    
    # Generate full story
    if args.hero:
        generate_story(args.hero, args.world, args.output)
        return
    
    # No arguments, show help
    parser.print_help()


if __name__ == "__main__":
    main()

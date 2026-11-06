import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addHours, startOfHour } from 'date-fns';
import { Infinity as InfinityIcon, Layers, Lock, Repeat, Search, Smile, Waves, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { DateTime24Input } from '../ui/Time24Input';
import { Textarea } from '../ui/Textarea';
import { Toggle } from '../ui/Toggle';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { CategoryMultiSelect } from './CategoryMultiSelect';
import { RecurrenceCustomDatePicker } from './RecurrenceScopeModal';
import {
  useCreateEvent,
  useUpdateEvent,
  useUpdateEventWithScope,
} from '../../hooks/useEvents';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';
import { applyFieldErrors, getErrorMessage } from '../../utils/errors';
import {
  formatDate,
  fromApiDateTime,
  fromInputDateTime,
  toApiDateTime,
  toInputDateTime,
} from '../../utils/date';
import {
  WEEKDAY_OPTIONS,
  buildScopeRequestDTO,
  generateUpcomingOccurrenceDates,
  getEventOccurrenceDate,
  getWeekdayNameFromDate,
  parseRecurrenceDays,
  serializeRecurrenceDays,
  type ScopeChoice,
} from '../../utils/recurrence';
import {
  EVENT_DESCRIPTION_MAX,
  EVENT_TITLE_MAX,
  eventSchema,
  type EventFormValues,
} from '../../utils/validation';
import type { ApiDate } from '../../types/api';
import type { CategoryResponseDTO } from '../../types/category';
import type {
  EventRequestDTO,
  EventResponseDTO,
  EventScopeRequestDTO,
  RecurrenceType,
  WeekdayName,
} from '../../types/event';

export interface EventSlotRange {
  start: Date;
  end: Date;
}

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'NONE', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Every day' },
  { value: 'WEEKLY', label: 'Every week' },
  { value: 'MONTHLY', label: 'Every month' },
  { value: 'YEARLY', label: 'Every year' },
];

const INTERVAL_UNIT_LABELS: Record<
  Exclude<RecurrenceType, 'NONE'>,
  { singular: string; plural: string }
> = {
  DAILY: { singular: 'day', plural: 'days' },
  WEEKLY: { singular: 'week', plural: 'weeks' },
  MONTHLY: { singular: 'month', plural: 'months' },
  YEARLY: { singular: 'year', plural: 'years' },
};

export interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, edits this event via PUT /api/events/{id} (or PUT /api/events/{id}/scope if recurring). */
  event?: EventResponseDTO | null;
  /** When set, pre-populates a new event from an existing event (1-click Duplicate). */
  duplicateFromEvent?: EventResponseDTO | null;
  /** Initial start/end when the user clicked or dragged a calendar slot. */
  initialSlot?: EventSlotRange | null;
  categories: CategoryResponseDTO[];
  /** Optional override used by tests to inspect the submitted payload directly. */
  onSubmitPayload?: (payload: EventRequestDTO) => Promise<void> | void;
  /** Optional override used by tests to inspect scoped edit payload directly. */
  onSubmitScopePayload?: (payload: EventScopeRequestDTO) => Promise<void> | void;
}

export interface CuratedEmoji {
  emoji: string;
  keywords: readonly string[];
}

export interface EmojiCategory {
  name: string;
  items: readonly CuratedEmoji[];
}

const EMOJI_CATEGORIES: readonly EmojiCategory[] = [
  {
    name: 'Books & Study',
    items: [
      { emoji: '📚', keywords: ['books', 'study', 'library', 'reading', 'homework', 'school'] },
      { emoji: '📖', keywords: ['open book', 'reading', 'study', 'literature', 'learn'] },
      { emoji: '📕', keywords: ['red book', 'closed book', 'reading'] },
      { emoji: '📗', keywords: ['green book', 'study', 'notebook'] },
      { emoji: '📘', keywords: ['blue book', 'study', 'notebook'] },
      { emoji: '📙', keywords: ['orange book', 'study', 'notebook'] },
      { emoji: '📓', keywords: ['notebook', 'journal', 'notes', 'diary'] },
      { emoji: '📔', keywords: ['notebook', 'diary', 'cover'] },
      { emoji: '📒', keywords: ['ledger', 'yellow notebook', 'notes', 'accounting'] },
      { emoji: '📑', keywords: ['bookmark tabs', 'tabs', 'organize', 'documents'] },
      { emoji: '🔖', keywords: ['bookmark', 'mark', 'reading', 'save'] },
      { emoji: '📜', keywords: ['scroll', 'history', 'document', 'diploma'] },
      { emoji: '📄', keywords: ['page', 'document', 'paper', 'text', 'assignment'] },
      { emoji: '📝', keywords: ['memo', 'notes', 'writing', 'pencil', 'exam', 'quiz'] },
      { emoji: '✍️', keywords: ['writing', 'handwriting', 'signature', 'author', 'essay'] },
      { emoji: '🖊️', keywords: ['pen', 'ballpoint', 'write', 'ink'] },
      { emoji: '🖋️', keywords: ['fountain pen', 'ink', 'signature', 'calligraphy'] },
      { emoji: '✏️', keywords: ['pencil', 'sketch', 'write', 'draw'] },
      { emoji: '🎓', keywords: ['graduation', 'cap', 'diploma', 'degree', 'college', 'university'] },
      { emoji: '🎒', keywords: ['backpack', 'school bag', 'class', 'student'] },
      { emoji: '📐', keywords: ['triangular ruler', 'math', 'geometry', 'architecture'] },
      { emoji: '📏', keywords: ['straight ruler', 'measure', 'math', 'scale'] },
      { emoji: '🔬', keywords: ['microscope', 'science', 'lab', 'biology', 'research'] },
      { emoji: '💡', keywords: ['lightbulb', 'idea', 'inspiration', 'insight', 'thought'] },
      { emoji: '🧮', keywords: ['abacus', 'math', 'calculation', 'arithmetic', 'accounting'] },
      { emoji: '🔭', keywords: ['telescope', 'astronomy', 'space', 'science', 'research', 'stars'] },
      { emoji: '🗂️', keywords: ['card index dividers', 'organize', 'files', 'study', 'flashcards'] },
      { emoji: '🖍️', keywords: ['crayon', 'draw', 'art', 'coloring', 'sketch'] },
      { emoji: '📎', keywords: ['paperclip', 'attachment', 'office', 'notes', 'hold'] },
      { emoji: '🧠', keywords: ['brain', 'mind', 'intellect', 'thinking', 'psychology', 'memory'] },
      { emoji: '🏛️', keywords: ['classical building', 'university', 'museum', 'architecture', 'institution'] },
      { emoji: '🗣️', keywords: ['speaking head', 'debate', 'presentation', 'speech', 'language', 'talk'] },
    ],
  },
  {
    name: 'Work & Tech',
    items: [
      { emoji: '💼', keywords: ['briefcase', 'work', 'job', 'business', 'office', 'career'] },
      { emoji: '💻', keywords: ['laptop', 'computer', 'coding', 'programming', 'software', 'work'] },
      { emoji: '🖥️', keywords: ['desktop', 'monitor', 'screen', 'computer', 'workstation'] },
      { emoji: '⌨️', keywords: ['keyboard', 'typing', 'code', 'shortcuts'] },
      { emoji: '🖱️', keywords: ['computer mouse', 'click', 'pointer'] },
      { emoji: '📱', keywords: ['mobile phone', 'smartphone', 'app', 'call', 'device'] },
      { emoji: '🧑‍💻', keywords: ['developer', 'programmer', 'software engineer', 'coding', 'coder', 'tech'] },
      { emoji: '🐛', keywords: ['bug', 'debug', 'issue', 'fix', 'troubleshoot', 'defect'] },
      { emoji: '🔧', keywords: ['wrench', 'tool', 'maintenance', 'fix', 'settings', 'repair'] },
      { emoji: '🛠️', keywords: ['hammer and wrench', 'tools', 'build', 'repair', 'dev', 'config'] },
      { emoji: '🌐', keywords: ['globe with meridians', 'web', 'internet', 'network', 'worldwide', 'online'] },
      { emoji: '🔒', keywords: ['locked', 'security', 'privacy', 'auth', 'protection'] },
      { emoji: '🔑', keywords: ['key', 'access', 'token', 'auth', 'password', 'solution'] },
      { emoji: '📡', keywords: ['satellite antenna', 'communication', 'broadcast', 'signals', 'network'] },
      { emoji: '🤖', keywords: ['robot', 'ai', 'automation', 'bot', 'machine learning', 'artificial intelligence'] },
      { emoji: '🚀', keywords: ['rocket', 'launch', 'deploy', 'release', 'fast', 'startup'] },
      { emoji: '🏢', keywords: ['office building', 'work', 'company', 'corporate', 'agency'] },
      { emoji: '🤝', keywords: ['handshake', 'deal', 'agreement', 'partnership', 'meeting', 'contract'] },
      { emoji: '📊', keywords: ['bar chart', 'analytics', 'statistics', 'metrics', 'data', 'graph'] },
      { emoji: '📈', keywords: ['chart increasing', 'growth', 'trending', 'stocks', 'success'] },
      { emoji: '📉', keywords: ['chart decreasing', 'downturn', 'loss'] },
      { emoji: '📋', keywords: ['clipboard', 'checklist', 'tasks', 'todo', 'audit'] },
      { emoji: '📁', keywords: ['file folder', 'directory', 'storage'] },
      { emoji: '📂', keywords: ['open folder', 'documents', 'archive'] },
      { emoji: '🗓️', keywords: ['spiral calendar', 'schedule', 'planning', 'agenda'] },
      { emoji: '✉️', keywords: ['envelope', 'email', 'mail', 'message', 'inbox'] },
      { emoji: '📞', keywords: ['telephone', 'phone call', 'hotline', 'client call'] },
      { emoji: '🧪', keywords: ['test tube', 'experiment', 'chemistry', 'testing', 'qa'] },
      { emoji: '🧬', keywords: ['dna', 'genetics', 'science', 'research', 'data'] },
      { emoji: '🔍', keywords: ['magnifying glass', 'search', 'investigate', 'find', 'explore'] },
      { emoji: '⚙️', keywords: ['gear', 'settings', 'configuration', 'system', 'engine'] },
      { emoji: '🖨️', keywords: ['printer', 'print', 'paper'] },
      { emoji: '💾', keywords: ['floppy disk', 'save', 'storage', 'backup'] },
      { emoji: '🏷️', keywords: ['label', 'tag', 'category', 'price'] },
    ],
  },
  {
    name: 'Sports & Fitness',
    items: [
      { emoji: '🏋️', keywords: ['weightlifting', 'gym', 'workout', 'training', 'fitness', 'weights'] },
      { emoji: '🏃', keywords: ['runner', 'running', 'cardio', 'jogging', 'sprint'] },
      { emoji: '🚴', keywords: ['cycling', 'bike', 'biking', 'bicycle', 'cardio'] },
      { emoji: '🧘', keywords: ['yoga', 'meditation', 'mindfulness', 'stretch', 'pilates'] },
      { emoji: '🧘‍♂️', keywords: ['man in lotus position', 'yoga', 'meditation', 'zen', 'calm'] },
      { emoji: '🚶', keywords: ['walking', 'pedestrian', 'steps', 'stroll'] },
      { emoji: '🧗', keywords: ['climbing', 'rock climbing', 'bouldering', 'ascent'] },
      { emoji: '🏊', keywords: ['swimming', 'swimmer', 'pool', 'swim', 'laps'] },
      { emoji: '⚽', keywords: ['soccer', 'football', 'ball', 'match', 'kick'] },
      { emoji: '🏀', keywords: ['basketball', 'hoop', 'game', 'court'] },
      { emoji: '🎾', keywords: ['tennis', 'racket', 'court', 'match'] },
      { emoji: '🏐', keywords: ['volleyball', 'beach', 'spike'] },
      { emoji: '🏸', keywords: ['badminton', 'shuttlecock', 'court'] },
      { emoji: '🥊', keywords: ['boxing glove', 'boxing', 'sparring', 'fight', 'punch'] },
      { emoji: '🥋', keywords: ['martial arts uniform', 'karate', 'judo', 'bjj', 'taekwondo'] },
      { emoji: '🛹', keywords: ['skateboard', 'skating', 'park'] },
      { emoji: '⛷️', keywords: ['skier', 'skiing', 'snow', 'winter sports'] },
      { emoji: '🤸', keywords: ['cartwheel', 'gymnastics', 'acrobatics', 'flexibility'] },
      { emoji: '🎳', keywords: ['bowling', 'pins', 'strike'] },
      { emoji: '🤾', keywords: ['handball', 'sport', 'throw'] },
      { emoji: '🏌️', keywords: ['golfer', 'golf swing', 'club', 'course'] },
      { emoji: '🏇', keywords: ['horse racing', 'equestrian', 'jockey'] },
      { emoji: '🤺', keywords: ['fencing', 'sword', 'duel', 'foil'] },
      { emoji: '🛷', keywords: ['sled', 'bobsled', 'winter sports', 'snow'] },
      { emoji: '🏹', keywords: ['bow and arrow', 'archery', 'target', 'aim'] },
      { emoji: '🛶', keywords: ['canoe', 'kayak', 'rowing', 'water sports', 'paddle'] },
      { emoji: '🎽', keywords: ['running shirt', 'marathon', 'jersey', 'race bib'] },
      { emoji: '💪', keywords: ['flexed biceps', 'muscles', 'strength', 'workout', 'power', 'arm'] },
      { emoji: '🦵', keywords: ['leg', 'leg day', 'squat', 'kick', 'hamstring'] },
      { emoji: '🫀', keywords: ['anatomical heart', 'cardio', 'pulse', 'circulation', 'endurance'] },
      { emoji: '🏆', keywords: ['trophy', 'champion', 'winner', 'award', 'first'] },
      { emoji: '🥇', keywords: ['1st place medal', 'gold', 'winner', 'victory'] },
      { emoji: '👟', keywords: ['running shoe', 'sneaker', 'athletics', 'trainers'] },
      { emoji: '⛳', keywords: ['golf', 'flag in hole', 'putting'] },
      { emoji: '🏄', keywords: ['surfing', 'surf', 'waves', 'ocean'] },
      { emoji: '🚵', keywords: ['mountain biking', 'trail', 'offroad'] },
    ],
  },
  {
    name: 'Health & Mind',
    items: [
      { emoji: '🩺', keywords: ['stethoscope', 'doctor', 'checkup', 'medical', 'clinic', 'exam'] },
      { emoji: '💊', keywords: ['pill', 'medicine', 'prescription', 'vitamins', 'medication'] },
      { emoji: '👁️', keywords: ['eye', 'vision', 'optometry', 'sight', 'ophthalmology'] },
      { emoji: '👀', keywords: ['eyes', 'looking', 'observe', 'inspection'] },
      { emoji: '🦷', keywords: ['tooth', 'dentist', 'dental', 'teeth', 'hygiene'] },
      { emoji: '🩸', keywords: ['drop of blood', 'blood test', 'donation', 'lab'] },
      { emoji: '🧬', keywords: ['dna', 'genetics', 'biology', 'health test', 'screening'] },
      { emoji: '🏥', keywords: ['hospital', 'clinic', 'emergency room', 'medical center'] },
      { emoji: '🚑', keywords: ['ambulance', 'emergency', 'paramedic', 'first responder'] },
      { emoji: '🍵', keywords: ['green tea', 'matcha', 'detox', 'tea', 'calm', 'antioxidants'] },
      { emoji: '🧖', keywords: ['person in steamy room', 'sauna', 'spa', 'steam', 'wellness'] },
      { emoji: '🛌', keywords: ['person in bed', 'sleep', 'rest', 'recovery', 'bedtime'] },
      { emoji: '🫁', keywords: ['lungs', 'breathing', 'breathwork', 'respiratory', 'oxygen'] },
      { emoji: '👂', keywords: ['ear', 'hearing', 'audiology', 'listen'] },
      { emoji: '🍎', keywords: ['red apple', 'nutrition', 'healthy', 'diet', 'fruit'] },
      { emoji: '🥑', keywords: ['avocado', 'healthy food', 'nutrition', 'fats'] },
      { emoji: '🥗', keywords: ['green salad', 'healthy diet', 'meal', 'greens'] },
      { emoji: '💧', keywords: ['water droplet', 'hydration', 'drink water', 'h2o'] },
      { emoji: '🌱', keywords: ['seedling', 'wellness', 'growth', 'organic'] },
      { emoji: '🌿', keywords: ['herb', 'natural', 'remedy', 'plant'] },
      { emoji: '😴', keywords: ['sleeping', 'sleep', 'rest', 'nap', 'bedtime', 'snooze'] },
      { emoji: '🧘‍♀️', keywords: ['woman in lotus position', 'meditation', 'zen', 'mindfulness'] },
      { emoji: '🧴', keywords: ['lotion bottle', 'skincare', 'hygiene', 'sunscreen'] },
      { emoji: '🩹', keywords: ['adhesive bandage', 'first aid', 'recovery', 'heal', 'wound'] },
      { emoji: '❤️', keywords: ['red heart', 'wellness', 'love', 'cardiac'] },
      { emoji: '🤍', keywords: ['white heart', 'peace', 'calm', 'clarity'] },
      { emoji: '✨', keywords: ['sparkles', 'clarity', 'energy', 'vitality', 'glow'] },
      { emoji: '🛁', keywords: ['bathtub', 'bath', 'relax', 'self-care', 'soak'] },
    ],
  },
  {
    name: 'Food & Drinks',
    items: [
      { emoji: '☕', keywords: ['coffee', 'cafe', 'espresso', 'break', 'morning', 'caffeine'] },
      { emoji: '🍵', keywords: ['green tea', 'tea', 'matcha', 'hot drink'] },
      { emoji: '🧋', keywords: ['bubble tea', 'boba', 'milky'] },
      { emoji: '🥤', keywords: ['cup with straw', 'soda', 'drink', 'beverage', 'smoothie'] },
      { emoji: '🍽️', keywords: ['fork and knife with plate', 'dinner', 'lunch', 'meal', 'eating', 'restaurant'] },
      { emoji: '🍳', keywords: ['cooking', 'egg', 'breakfast', 'skillet'] },
      { emoji: '🥐', keywords: ['croissant', 'bakery', 'pastry', 'breakfast'] },
      { emoji: '🥪', keywords: ['sandwich', 'lunch', 'sub', 'snack'] },
      { emoji: '🍕', keywords: ['pizza', 'slice', 'italian', 'dinner'] },
      { emoji: '🍔', keywords: ['hamburger', 'burger', 'fast food'] },
      { emoji: '🍟', keywords: ['french fries', 'fries', 'fast food'] },
      { emoji: '🍜', keywords: ['steaming bowl', 'ramen', 'noodles', 'soup', 'asian'] },
      { emoji: '🍱', keywords: ['bento box', 'meal', 'japanese', 'lunch'] },
      { emoji: '🍣', keywords: ['sushi', 'japanese food', 'sashimi', 'fish'] },
      { emoji: '🌮', keywords: ['taco', 'mexican food', 'dinner'] },
      { emoji: '🥗', keywords: ['green salad', 'healthy meal', 'diet'] },
      { emoji: '🥩', keywords: ['cut of meat', 'steak', 'beef', 'protein', 'bbq'] },
      { emoji: '🍗', keywords: ['poultry leg', 'chicken', 'meat', 'drumstick'] },
      { emoji: '🥞', keywords: ['pancakes', 'breakfast', 'syrup', 'stack'] },
      { emoji: '🧇', keywords: ['waffle', 'breakfast', 'brunch'] },
      { emoji: '🥯', keywords: ['bagel', 'breakfast', 'bakery', 'cream cheese'] },
      { emoji: '🧀', keywords: ['cheese wedge', 'dairy', 'snack'] },
      { emoji: '🥨', keywords: ['pretzel', 'snack', 'bavarian'] },
      { emoji: '🥟', keywords: ['dumpling', 'asian food', 'dim sum', 'gyoza'] },
      { emoji: '🍲', keywords: ['pot of food', 'stew', 'soup', 'hotpot'] },
      { emoji: '🥣', keywords: ['bowl with spoon', 'cereal', 'oatmeal', 'soup', 'breakfast'] },
      { emoji: '🧃', keywords: ['beverage box', 'juice', 'drink', 'kids'] },
      { emoji: '🥛', keywords: ['glass of milk', 'dairy', 'calcium', 'drink'] },
      { emoji: '🍼', keywords: ['baby bottle', 'feeding', 'milk', 'infant'] },
      { emoji: '🍰', keywords: ['shortcake', 'cake', 'dessert', 'celebration', 'birthday'] },
      { emoji: '🍫', keywords: ['chocolate bar', 'sweet', 'candy'] },
      { emoji: '🍦', keywords: ['soft ice cream', 'cone', 'dessert', 'treat'] },
      { emoji: '🍇', keywords: ['grapes', 'fruit', 'snack'] },
      { emoji: '🍓', keywords: ['strawberry', 'fruit', 'berry'] },
      { emoji: '🍷', keywords: ['wine glass', 'wine', 'drinks', 'evening'] },
      { emoji: '🍺', keywords: ['beer mug', 'beer', 'pub', 'cheers'] },
      { emoji: '🍻', keywords: ['clinking beer mugs', 'cheers', 'happy hour', 'celebrate'] },
    ],
  },
  {
    name: 'Daily & Home',
    items: [
      { emoji: '🏠', keywords: ['house', 'home', 'domestic', 'family', 'residence'] },
      { emoji: '🛋️', keywords: ['couch and lamp', 'living room', 'relax', 'sofa'] },
      { emoji: '🛏️', keywords: ['bed', 'bedroom', 'rest', 'sleep'] },
      { emoji: '🚿', keywords: ['shower', 'bathroom', 'wash', 'clean'] },
      { emoji: '🧹', keywords: ['broom', 'cleaning', 'chores', 'sweeping', 'tidy'] },
      { emoji: '🧼', keywords: ['soap', 'cleaning', 'wash hands', 'sanitizer', 'hygiene'] },
      { emoji: '🧽', keywords: ['sponge', 'dishes', 'cleaning', 'scrub'] },
      { emoji: '🪣', keywords: ['bucket', 'chores', 'mop', 'cleaning'] },
      { emoji: '🧺', keywords: ['basket', 'laundry', 'clothes', 'washing'] },
      { emoji: '🛒', keywords: ['shopping cart', 'groceries', 'store', 'market'] },
      { emoji: '📦', keywords: ['package', 'delivery', 'shipping', 'box', 'order'] },
      { emoji: '🔑', keywords: ['key', 'house key', 'door', 'lock'] },
      { emoji: '🚗', keywords: ['automobile', 'car', 'commute', 'driving', 'road trip'] },
      { emoji: '🚌', keywords: ['bus', 'transit', 'commute', 'public transportation'] },
      { emoji: '🚆', keywords: ['train', 'commute', 'railway', 'travel', 'rail'] },
      { emoji: '🚇', keywords: ['metro', 'subway', 'underground', 'commute'] },
      { emoji: '🚲', keywords: ['bicycle', 'bike', 'cycling', 'commute'] },
      { emoji: '⛽', keywords: ['fuel pump', 'gas station', 'refuel', 'petrol'] },
      { emoji: '🔌', keywords: ['electric plug', 'power', 'charging', 'electronics', 'energy'] },
      { emoji: '🛍️', keywords: ['shopping bags', 'mall', 'retail', 'buy', 'purchases'] },
      { emoji: '📮', keywords: ['postbox', 'mail', 'postal', 'letters', 'send'] },
      { emoji: '🗑️', keywords: ['wastebasket', 'trash', 'garbage', 'recycle', 'cleanup', 'bin'] },
      { emoji: '🐾', keywords: ['paw prints', 'pets', 'vet', 'animals', 'dog walk'] },
      { emoji: '🐕', keywords: ['dog', 'pet', 'walk the dog', 'canine', 'puppy'] },
      { emoji: '🐈', keywords: ['cat', 'pet', 'kitten', 'feline'] },
      { emoji: '🪴', keywords: ['potted plant', 'gardening', 'houseplant', 'water plants', 'greenery'] },
      { emoji: '🌸', keywords: ['cherry blossom', 'flowers', 'spring', 'garden'] },
      { emoji: '☀️', keywords: ['sun', 'morning', 'daytime', 'weather', 'sunny'] },
      { emoji: '🌙', keywords: ['crescent moon', 'night', 'evening', 'bedtime'] },
      { emoji: '👕', keywords: ['t-shirt', 'clothing', 'wardrobe', 'outfit'] },
      { emoji: '👔', keywords: ['necktie', 'formal wear', 'suit', 'work dress'] },
      { emoji: '⏰', keywords: ['alarm clock', 'wake up', 'reminder', 'time'] },
      { emoji: '💰', keywords: ['money bag', 'finance', 'budget', 'banking', 'salary'] },
      { emoji: '💳', keywords: ['credit card', 'payment', 'shopping', 'bill'] },
    ],
  },
  {
    name: 'Activities & Fun',
    items: [
      { emoji: '🎉', keywords: ['party popper', 'celebration', 'party', 'congrats', 'festival'] },
      { emoji: '🎂', keywords: ['birthday cake', 'anniversary', 'birthday', 'celebrate', 'dessert'] },
      { emoji: '✈️', keywords: ['airplane', 'flight', 'travel', 'trip', 'vacation', 'airport'] },
      { emoji: '🧳', keywords: ['luggage', 'packing', 'suitcase', 'travel', 'trip'] },
      { emoji: '🎮', keywords: ['video game', 'gaming', 'play', 'console', 'playstation', 'xbox'] },
      { emoji: '🕹️', keywords: ['joystick', 'arcade', 'retro games'] },
      { emoji: '🎲', keywords: ['game die', 'board games', 'tabletop', 'roll'] },
      { emoji: '♟️', keywords: ['chess pawn', 'chess', 'strategy', 'match'] },
      { emoji: '🧩', keywords: ['puzzle piece', 'puzzle', 'riddle', 'problem solving'] },
      { emoji: '🎵', keywords: ['musical note', 'music', 'song', 'melody'] },
      { emoji: '🎧', keywords: ['headphones', 'music', 'podcast', 'audio', 'listening'] },
      { emoji: '🎸', keywords: ['guitar', 'instrument', 'music rehearsal', 'acoustic', 'electric'] },
      { emoji: '🎹', keywords: ['musical keyboard', 'piano', 'practice', 'keys'] },
      { emoji: '🎻', keywords: ['violin', 'orchestra', 'classical music', 'strings'] },
      { emoji: '🥁', keywords: ['drum', 'rhythm', 'percussion', 'band', 'drumsticks'] },
      { emoji: '🎺', keywords: ['trumpet', 'brass', 'jazz', 'horn'] },
      { emoji: '🎷', keywords: ['saxophone', 'jazz', 'blues', 'music'] },
      { emoji: '🎤', keywords: ['microphone', 'karaoke', 'singing', 'speaking', 'podcast'] },
      { emoji: '💃', keywords: ['woman dancing', 'dance', 'party', 'salsa', 'celebrate'] },
      { emoji: '🕺', keywords: ['man dancing', 'dance club', 'disco', 'party'] },
      { emoji: '🎬', keywords: ['clapper board', 'movie', 'cinema', 'film', 'theater'] },
      { emoji: '🍿', keywords: ['popcorn', 'movie night', 'snack', 'cinema'] },
      { emoji: '🎨', keywords: ['artist palette', 'art', 'painting', 'creative', 'draw'] },
      { emoji: '📸', keywords: ['camera with flash', 'photography', 'photo', 'picture'] },
      { emoji: '📷', keywords: ['camera', 'photoshoot', 'picture', 'snapshot'] },
      { emoji: '🏖️', keywords: ['beach with umbrella', 'vacation', 'holiday', 'sea', 'summer'] },
      { emoji: '⛺', keywords: ['tent', 'camping', 'outdoors', 'nature', 'hike'] },
      { emoji: '🎆', keywords: ['fireworks', 'festival', 'celebration', 'new year'] },
      { emoji: '🎟️', keywords: ['admission tickets', 'concert', 'event', 'show', 'cinema'] },
      { emoji: '🎡', keywords: ['ferris wheel', 'amusement park', 'fair', 'carnival'] },
      { emoji: '🎢', keywords: ['roller coaster', 'theme park', 'adventure', 'thrill'] },
      { emoji: '🎭', keywords: ['performing arts', 'theater', 'drama', 'acting'] },
      { emoji: '🎯', keywords: ['bullseye', 'direct hit', 'target', 'goal', 'darts'] },
      { emoji: '🛳️', keywords: ['passenger ship', 'cruise', 'boat trip', 'voyage'] },
      { emoji: '🗺️', keywords: ['world map', 'travel planning', 'navigation', 'adventure', 'explore'] },
      { emoji: '🧶', keywords: ['yarn', 'knitting', 'crochet', 'crafting', 'hobby'] },
    ],
  },
  {
    name: 'Focus & Alerts',
    items: [
      { emoji: '⏰', keywords: ['alarm clock', 'deadline', 'wake up', 'timer'] },
      { emoji: '⏱️', keywords: ['stopwatch', 'timer', 'sprint', 'focus block', 'time track'] },
      { emoji: '⏲️', keywords: ['timer clock', 'countdown', 'pomodoro', 'kitchen timer'] },
      { emoji: '⏳', keywords: ['hourglass done', 'time limit', 'deadline', 'timer', 'running out'] },
      { emoji: '⌛', keywords: ['hourglass not done', 'waiting', 'patience', 'in progress'] },
      { emoji: '🔕', keywords: ['bell with slash', 'do not disturb', 'mute', 'silent', 'focus mode', 'quiet'] },
      { emoji: '📌', keywords: ['pushpin', 'pinned', 'important note', 'sticky', 'priority'] },
      { emoji: '📍', keywords: ['round pushpin', 'location', 'venue', 'destination', 'pin'] },
      { emoji: '🚩', keywords: ['triangular flag', 'milestone', 'flagged', 'marker', 'checkpoint'] },
      { emoji: '⚡', keywords: ['high voltage', 'lightning', 'energy', 'fast', 'quick task', 'power'] },
      { emoji: '🧭', keywords: ['compass', 'direction', 'guidance', 'strategy', 'navigation'] },
      { emoji: '⭐', keywords: ['star', 'favorite', 'important', 'featured', 'star rating'] },
      { emoji: '🌟', keywords: ['glowing star', 'highlight', 'special', 'success'] },
      { emoji: '💎', keywords: ['gem stone', 'valuable', 'milestone', 'quality', 'premium'] },
      { emoji: '🔔', keywords: ['bell', 'notification', 'reminder', 'alert', 'chime'] },
      { emoji: '📢', keywords: ['loudspeaker', 'announcement', 'broadcast', 'shout', 'alert'] },
      { emoji: '📣', keywords: ['megaphone', 'callout', 'announcement', 'promo', 'cheer'] },
      { emoji: '🚨', keywords: ['police car light', 'emergency', 'urgent', 'critical', 'alert'] },
      { emoji: '⚠️', keywords: ['warning', 'caution', 'attention', 'hazard', 'notice'] },
      { emoji: '🛡️', keywords: ['shield', 'security', 'protection', 'defense', 'safe'] },
      { emoji: '✅', keywords: ['check mark button', 'completed', 'done', 'approved', 'pass'] },
      { emoji: '❌', keywords: ['cross mark', 'cancelled', 'rejected', 'failed', 'no'] },
      { emoji: '🛑', keywords: ['stop sign', 'blocked', 'halt', 'barrier'] },
      { emoji: '🏁', keywords: ['chequered flag', 'finish line', 'complete', 'milestone', 'done'] },
      { emoji: '🚀', keywords: ['rocket', 'launch', 'fast', 'boost', 'sprint'] },
      { emoji: '💯', keywords: ['hundred points', 'perfect', 'goal reached', 'score'] },
      { emoji: '🔮', keywords: ['crystal ball', 'future planning', 'vision', 'roadmap'] },
    ],
  },
] as const;

function buildDefaultValues(
  sourceEvent?: EventResponseDTO | null,
  initialSlot?: EventSlotRange | null,
): EventFormValues {
  if (sourceEvent) {
    const startDate = fromApiDateTime(sourceEvent.startTime);
    const recurrenceType: RecurrenceType = sourceEvent.recurrenceType ?? 'NONE';
    const hasEndDate = Boolean(
      sourceEvent.recurrenceEndDate && sourceEvent.recurrenceEndDate.trim() !== '',
    );
    const parsedDays = parseRecurrenceDays(sourceEvent.recurrenceDays);
    const defaultWeekday = getWeekdayNameFromDate(startDate);

    return {
      title: sourceEvent.title,
      emoji: sourceEvent.emoji ?? '',
      description: sourceEvent.description ?? '',
      startTime: toInputDateTime(startDate),
      endTime: toInputDateTime(fromApiDateTime(sourceEvent.endTime)),
      isFlexible: sourceEvent.isFlexible,
      isPrivate: sourceEvent.isPrivate,
      categoryIds: sourceEvent.categories.map((c) => c.categoryId),
      recurrenceType,
      recurrenceInterval:
        sourceEvent.recurrenceInterval && sourceEvent.recurrenceInterval >= 1
          ? sourceEvent.recurrenceInterval
          : 1,
      recurrenceDays: parsedDays.length > 0 ? parsedDays : [defaultWeekday],
      repeatForever: !hasEndDate,
      recurrenceEndDate: sourceEvent.recurrenceEndDate ?? '',
    };
  }

  const defaultStart = initialSlot?.start ?? addHours(startOfHour(new Date()), 1);
  const defaultEnd = initialSlot?.end ?? addHours(defaultStart, 1);

  return {
    title: '',
    emoji: '',
    description: '',
    startTime: toInputDateTime(defaultStart),
    endTime: toInputDateTime(defaultEnd),
    isFlexible: false,
    isPrivate: false,
    categoryIds: [],
    recurrenceType: 'NONE',
    recurrenceInterval: 1,
    recurrenceDays: [getWeekdayNameFromDate(defaultStart)],
    repeatForever: true,
    recurrenceEndDate: '',
  };
}

function EventFormBody({
  onClose,
  event,
  duplicateFromEvent,
  initialSlot,
  categories,
  onSubmitPayload,
  onSubmitScopePayload,
}: Omit<EventFormModalProps, 'isOpen'>) {
  const isEditing = Boolean(event);
  const templateEvent = event ?? duplicateFromEvent ?? null;
  const isRecurringEvent = Boolean(
    event?.recurrenceType && event.recurrenceType !== 'NONE',
  );
  const repeatSelectId = useId();
  const intervalInputId = useId();
  const toast = useToast();
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const updateScopeMutation = useUpdateEventWithScope();

  const currentOccurrenceDate = useMemo(
    () => (event ? getEventOccurrenceDate(event) : ''),
    [event],
  );
  const upcomingOccurrences = useMemo(
    () => (event && isRecurringEvent ? generateUpcomingOccurrenceDates(event, 3, 12) : []),
    [event, isRecurringEvent],
  );

  const [scopeChoice, setScopeChoice] = useState<ScopeChoice>('THIS_ONLY');
  const [selectedCustomDates, setSelectedCustomDates] = useState<ApiDate[]>(() =>
    currentOccurrenceDate ? [currentOccurrenceDate] : [],
  );
  const [daysTouched, setDaysTouched] = useState<boolean>(() =>
    Boolean(templateEvent?.recurrenceDays),
  );
  const [intervalTouched, setIntervalTouched] = useState<boolean>(() =>
    Boolean(templateEvent?.recurrenceInterval && templateEvent.recurrenceInterval > 1),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [initialDefaults] = useState(() =>
    buildDefaultValues(templateEvent, initialSlot),
  );

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: initialDefaults,
  });

  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<string>('All');
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const normalizedEmojiQuery = emojiSearchQuery.trim().toLowerCase();

  const filteredEmojiCategories = useMemo(() => {
    if (!normalizedEmojiQuery) {
      if (selectedEmojiCategory === 'All') return EMOJI_CATEGORIES;
      return EMOJI_CATEGORIES.filter((cat) => cat.name === selectedEmojiCategory);
    }

    return EMOJI_CATEGORIES.map((cat) => {
      const categoryMatches = cat.name.toLowerCase().includes(normalizedEmojiQuery);
      const matchingItems = cat.items.filter((item) => {
        if (categoryMatches) return true;
        if (item.emoji.includes(normalizedEmojiQuery)) return true;
        return item.keywords.some((kw) => kw.toLowerCase().includes(normalizedEmojiQuery));
      });

      return {
        name: cat.name,
        items: matchingItems,
      };
    }).filter((cat) => cat.items.length > 0);
  }, [normalizedEmojiQuery, selectedEmojiCategory]);

  const totalMatchingEmojis = useMemo(
    () => filteredEmojiCategories.reduce((sum, cat) => sum + cat.items.length, 0),
    [filteredEmojiCategories],
  );

  useEffect(() => {
    if (!isEmojiPickerOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEmojiPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEmojiPickerOpen]);

  const watchedDescription = useWatch({ control, name: 'description' });
  const watchedEmoji = useWatch({ control, name: 'emoji' });
  const watchedFlexible = useWatch({ control, name: 'isFlexible' });
  const watchedPrivate = useWatch({ control, name: 'isPrivate' });
  const watchedCategoryIds = useWatch({ control, name: 'categoryIds' });
  const watchedRecurrenceType = useWatch({ control, name: 'recurrenceType' });
  const watchedRecurrenceInterval = useWatch({ control, name: 'recurrenceInterval' });
  const watchedRecurrenceDays = useWatch({ control, name: 'recurrenceDays' });
  const watchedRepeatForever = useWatch({ control, name: 'repeatForever' });
  const watchedStartTime = useWatch({ control, name: 'startTime' });
  const watchedEndTime = useWatch({ control, name: 'endTime' });

  const toggleWeekdayPill = (day: WeekdayName) => {
    setDaysTouched(true);
    const exists = watchedRecurrenceDays.includes(day);
    let next: WeekdayName[];
    if (exists) {
      // Keep at least one weekday selected
      next =
        watchedRecurrenceDays.length > 1
          ? watchedRecurrenceDays.filter((d) => d !== day)
          : watchedRecurrenceDays;
    } else {
      next = [...watchedRecurrenceDays, day];
    }
    setValue('recurrenceDays', next, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (values: EventFormValues) => {
    setFormError(null);

    if (event && isRecurringEvent && scopeChoice === 'CUSTOM' && selectedCustomDates.length === 0) {
      setFormError('Please select at least one occurrence date to update.');
      return;
    }

    const startDate = fromInputDateTime(values.startTime);
    const trimmedDesc = values.description.trim();
    const includeRecurrence =
      values.recurrenceType !== 'NONE' || isRecurringEvent;

    const resolvedEndDate =
      values.recurrenceType === 'NONE' || values.repeatForever
        ? null
        : values.recurrenceEndDate.trim() || null;

    const normalizedInterval =
      Number.isInteger(values.recurrenceInterval) && values.recurrenceInterval >= 1
        ? values.recurrenceInterval
        : 1;

    const includeInterval =
      values.recurrenceType !== 'NONE' &&
      (normalizedInterval > 1 ||
        intervalTouched ||
        templateEvent?.recurrenceInterval !== undefined);

    const startWeekday = getWeekdayNameFromDate(startDate);
    const activeDays =
      values.recurrenceDays.length > 0 ? values.recurrenceDays : [startWeekday];
    const serializedDays = serializeRecurrenceDays(activeDays);
    const includeDays =
      values.recurrenceType === 'WEEKLY' &&
      (daysTouched ||
        activeDays.length > 1 ||
        activeDays[0] !== startWeekday ||
        Boolean(templateEvent?.recurrenceDays));

    const trimmedEmoji = values.emoji?.trim();
    const emojiPayload = trimmedEmoji
      ? { emoji: trimmedEmoji }
      : isEditing && templateEvent?.emoji
        ? { emoji: null }
        : {};

    const payload: EventRequestDTO = {
      title: values.title.trim(),
      ...emojiPayload,
      ...(trimmedDesc !== '' ? { description: trimmedDesc } : {}),
      startTime: toApiDateTime(startDate),
      endTime: toApiDateTime(fromInputDateTime(values.endTime)),
      isFlexible: values.isFlexible,
      categoryIds: values.categoryIds,
      isPrivate: values.isPrivate,
      ...(includeRecurrence
        ? {
            recurrenceType: values.recurrenceType,
            recurrenceEndDate: resolvedEndDate,
          }
        : {}),
      ...(includeInterval ? { recurrenceInterval: normalizedInterval } : {}),
      ...(includeDays ? { recurrenceDays: serializedDays } : {}),
    };

    try {
      if (event && isRecurringEvent) {
        const scopePayload = buildScopeRequestDTO(
          scopeChoice,
          currentOccurrenceDate,
          selectedCustomDates,
          payload,
        );

        if (onSubmitScopePayload) {
          await onSubmitScopePayload(scopePayload);
        } else if (onSubmitPayload) {
          await onSubmitPayload(payload);
        } else {
          await updateScopeMutation.mutateAsync({
            eventId: event.eventId,
            body: scopePayload,
          });
          toast.success('Event updated');
        }
      } else if (onSubmitPayload) {
        await onSubmitPayload(payload);
      } else if (event) {
        await updateMutation.mutateAsync({
          eventId: event.eventId,
          body: payload,
        });
        toast.success('Event updated');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(duplicateFromEvent ? 'Event duplicated' : 'Event created');
      }
      onClose();
    } catch (error) {
      const mapped = applyFieldErrors(error, setError, [
        'title',
        'description',
        'startTime',
        'endTime',
        'recurrenceEndDate',
      ]);
      if (!mapped) setFormError(getErrorMessage(error));
    }
  };

  const inlineScopeOptions: {
    id: ScopeChoice;
    label: string;
    description: string;
  }[] = [
    {
      id: 'THIS_ONLY',
      label: 'This event only',
      description: currentOccurrenceDate
        ? `Only ${formatDate(currentOccurrenceDate)}`
        : 'Only this occurrence',
    },
    {
      id: 'THIS_AND_FOLLOWING',
      label: 'This and following events',
      description: 'From this date onward',
    },
    {
      id: 'ALL',
      label: 'All events in series',
      description: 'Every occurrence in series',
    },
    {
      id: 'CUSTOM',
      label: 'Custom dates...',
      description: 'Pick specific occurrences',
    },
  ];

  const intervalUnit =
    watchedRecurrenceType !== 'NONE'
      ? watchedRecurrenceInterval === 1
        ? INTERVAL_UNIT_LABELS[watchedRecurrenceType].singular
        : INTERVAL_UNIT_LABELS[watchedRecurrenceType].plural
      : 'days';

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && <Alert variant="error">{formError}</Alert>}

      {/* Title & Emoji Picker */}
      <div className="w-full space-y-1.5">
        <label htmlFor="event-title-input" className="block text-sm font-medium text-zinc-300">
          Title
        </label>
        <div className="relative flex items-center gap-2">
          {/* Emoji Picker Trigger & Popover */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
              aria-label={
                watchedEmoji
                  ? `Emoji: ${watchedEmoji} (click to change)`
                  : 'Pick an emoji for this event'
              }
              title={watchedEmoji ? `Emoji: ${watchedEmoji} (click to change)` : 'Add emoji'}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                watchedEmoji
                  ? 'border-indigo-400/50 bg-indigo-500/15 text-zinc-100 hover:bg-indigo-500/25'
                  : 'border-dark-border bg-dark-bg/70 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200',
              )}
            >
              {watchedEmoji ? (
                <span className="text-xl leading-none">{watchedEmoji}</span>
              ) : (
                <Smile className="h-5 w-5" aria-hidden="true" />
              )}
            </button>

            {isEmojiPickerOpen && (
              <div
                ref={emojiPickerRef}
                className="absolute left-0 top-13 z-50 w-84 max-w-[92vw] rounded-2xl border border-dark-border bg-dark-surface p-3.5 shadow-2xl backdrop-blur-md animate-fade-in sm:w-96"
                role="dialog"
                aria-label="Choose emoji"
              >
                <div className="mb-2 flex items-center justify-between border-b border-dark-border/80 pb-2">
                  <span className="text-xs font-semibold text-zinc-100">Select Emoji</span>
                  <div className="flex items-center gap-1.5">
                    {watchedEmoji && (
                      <button
                        type="button"
                        onClick={() => {
                          setValue('emoji', '', { shouldDirty: true, shouldValidate: true });
                          setIsEmojiPickerOpen(false);
                          setEmojiSearchQuery('');
                        }}
                        className="rounded-md px-2 py-0.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/15"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmojiPickerOpen(false);
                        setEmojiSearchQuery('');
                      }}
                      className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-dark-hover hover:text-zinc-200"
                      aria-label="Close emoji picker"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-2.5">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    placeholder="Search emojis (e.g. gym, code, eye, coffee, study)..."
                    value={emojiSearchQuery}
                    onChange={(e) => setEmojiSearchQuery(e.target.value)}
                    className="h-8 w-full rounded-lg border border-dark-border bg-dark-bg/80 pl-8 pr-8 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
                  />
                  {emojiSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setEmojiSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-zinc-400 hover:text-zinc-200"
                      aria-label="Clear emoji search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Pills (visible when not actively searching) */}
                {!normalizedEmojiQuery && (
                  <div className="mb-2.5 flex items-center gap-1 overflow-x-auto pb-1 text-xs scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setSelectedEmojiCategory('All')}
                      className={cn(
                        'shrink-0 rounded-lg px-2.5 py-1 font-medium transition-colors',
                        selectedEmojiCategory === 'All'
                          ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-inset ring-indigo-400/30'
                          : 'text-zinc-400 hover:bg-dark-hover hover:text-zinc-200',
                      )}
                    >
                      All
                    </button>
                    {EMOJI_CATEGORIES.map((cat) => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setSelectedEmojiCategory(cat.name)}
                        className={cn(
                          'shrink-0 rounded-lg px-2.5 py-1 font-medium transition-colors',
                          selectedEmojiCategory === cat.name
                            ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-inset ring-indigo-400/30'
                            : 'text-zinc-400 hover:bg-dark-hover hover:text-zinc-200',
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Emoji Grid */}
                <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                  {totalMatchingEmojis === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-400">
                      No matching emojis found for &ldquo;{emojiSearchQuery.trim()}&rdquo;
                    </div>
                  ) : (
                    filteredEmojiCategories.map((cat) => (
                      <div key={cat.name}>
                        <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          <span>{cat.name}</span>
                          {normalizedEmojiQuery && (
                            <span className="font-mono text-[9px] text-zinc-500">
                              {cat.items.length}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-8">
                          {cat.items.map((item) => (
                            <button
                              key={item.emoji}
                              type="button"
                              aria-label={item.emoji}
                              onClick={() => {
                                setValue('emoji', item.emoji, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                                setIsEmojiPickerOpen(false);
                                setEmojiSearchQuery('');
                              }}
                              className={cn(
                                'flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-transform hover:scale-115 hover:bg-dark-hover active:scale-95 sm:h-10 sm:w-10 sm:text-2xl',
                                watchedEmoji === item.emoji &&
                                  'bg-indigo-500/25 ring-2 ring-indigo-400',
                              )}
                            >
                              {item.emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <input
              id="event-title-input"
              type="text"
              placeholder="e.g. Team Standup, Study Session"
              maxLength={EVENT_TITLE_MAX}
              autoFocus
              aria-invalid={errors.title ? true : undefined}
              className={cn(
                'h-10 sm:h-11 w-full rounded-lg border bg-dark-bg/70 px-3.5 text-sm sm:text-base text-zinc-100 outline-none transition-colors placeholder:text-zinc-500',
                'focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
                errors.title
                  ? 'border-red-500/70 focus:border-red-400 focus:ring-red-500/30'
                  : 'border-dark-border focus:border-indigo-400 focus:ring-indigo-500/30',
              )}
              {...register('title')}
            />
          </div>
        </div>
        {errors.title && (
          <p className="text-xs font-medium text-red-400">{errors.title.message}</p>
        )}
        {errors.emoji && (
          <p className="text-xs font-medium text-red-400">{errors.emoji.message}</p>
        )}
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <DateTime24Input
          label="Start time"
          watchedValue={watchedStartTime}
          error={errors.startTime?.message}
          {...register('startTime', {
            onChange: (e) => {
              if (!daysTouched) {
                const parsed = fromInputDateTime(String(e.target.value));
                setValue('recurrenceDays', [getWeekdayNameFromDate(parsed)]);
              }
            },
          })}
        />
        <DateTime24Input
          label="End time"
          watchedValue={watchedEndTime}
          error={errors.endTime?.message}
          {...register('endTime')}
        />
      </div>

      {/* Recurrence Section */}
      <div className="space-y-3 rounded-xl border border-dark-border bg-dark-bg/40 p-3.5">
        <div className="w-full space-y-1.5">
          <label
            htmlFor={repeatSelectId}
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-300"
          >
            <Repeat className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
            <span>Repeat</span>
          </label>
          <select
            id={repeatSelectId}
            disabled={isSubmitting}
            className="h-11 sm:h-10.5 w-full rounded-xl border border-dark-border bg-dark-bg/70 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            {...register('recurrenceType', {
              onChange: (e) => {
                if (e.target.value === 'WEEKLY' && watchedRecurrenceDays.length === 0) {
                  const parsed = fromInputDateTime(watchedStartTime);
                  setValue('recurrenceDays', [getWeekdayNameFromDate(parsed)]);
                }
              },
            })}
          >
            {RECURRENCE_OPTIONS.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-dark-surface text-zinc-100"
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {watchedRecurrenceType !== 'NONE' && (
          <div className="space-y-3 pt-1">
            {/* Custom Interval: Every [ X ] [days/weeks/months/years] */}
            <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-dark-border/80 bg-dark-surface/60 px-3 py-2">
              <label
                htmlFor={intervalInputId}
                className="text-xs font-medium text-zinc-300"
              >
                Repeat every
              </label>
              <input
                id={intervalInputId}
                type="number"
                min={1}
                max={99}
                disabled={isSubmitting}
                aria-label="Recurrence interval"
                className="h-10 w-24 rounded-lg border border-dark-border bg-dark-bg px-2.5 text-center text-xs sm:text-sm font-semibold text-zinc-100 outline-none transition-colors focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/40"
                {...register('recurrenceInterval', {
                  valueAsNumber: true,
                  onChange: () => setIntervalTouched(true),
                })}
              />
              <span className="text-xs font-medium text-zinc-300">{intervalUnit}</span>
            </div>

            {/* Multi-Day Weekly Weekday Selection Pills */}
            {watchedRecurrenceType === 'WEEKLY' && (
              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-zinc-300">
                  Repeat on days
                </span>
                <div
                  role="group"
                  aria-label="Repeat on days of the week"
                  className="flex flex-wrap items-center gap-1.5 sm:gap-2"
                >
                  {WEEKDAY_OPTIONS.map((dayOpt) => {
                    const isSelected = watchedRecurrenceDays.includes(dayOpt.value);
                    return (
                      <button
                        key={dayOpt.value}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => toggleWeekdayPill(dayOpt.value)}
                        aria-label={dayOpt.fullLabel}
                        aria-pressed={isSelected}
                        title={dayOpt.fullLabel}
                        className={cn(
                          'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border text-xs sm:text-sm font-semibold transition-all',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                          isSelected
                            ? 'border-indigo-400 bg-indigo-500 text-white shadow-xs'
                            : 'border-dark-border bg-dark-surface text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
                        )}
                      >
                        {dayOpt.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Toggle
              checked={watchedRepeatForever}
              onChange={(checked) => {
                setValue('repeatForever', checked, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
                if (checked) {
                  setValue('recurrenceEndDate', '', { shouldDirty: true });
                  clearErrors('recurrenceEndDate');
                }
              }}
              label="Repeat Forever"
              description="Continues indefinitely with no end date."
              icon={<InfinityIcon className="h-4 w-4" aria-hidden="true" />}
              disabled={isSubmitting}
            />

            {!watchedRepeatForever && (
              <Input
                label="Ends on"
                type="date"
                error={errors.recurrenceEndDate?.message}
                {...register('recurrenceEndDate')}
              />
            )}
          </div>
        )}
      </div>

      <Textarea
        label="Description"
        placeholder="Optional notes (never shown in squad calendars)"
        maxLength={EVENT_DESCRIPTION_MAX}
        rows={3}
        helperText={`${watchedDescription.length}/${EVENT_DESCRIPTION_MAX} characters`}
        error={errors.description?.message}
        {...register('description')}
      />

      <CategoryMultiSelect
        categories={categories}
        selectedIds={watchedCategoryIds}
        onChange={(nextIds) =>
          setValue('categoryIds', nextIds, { shouldValidate: true, shouldDirty: true })
        }
        disabled={isSubmitting}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle
          checked={watchedFlexible}
          onChange={(checked) =>
            setValue('isFlexible', checked, { shouldValidate: true, shouldDirty: true })
          }
          label="Flexible time"
          description="Can be moved if needed (shown with a dashed border)."
          icon={<Waves className="h-4 w-4" aria-hidden="true" />}
          disabled={isSubmitting}
        />
        <Toggle
          checked={watchedPrivate}
          onChange={(checked) =>
            setValue('isPrivate', checked, { shouldValidate: true, shouldDirty: true })
          }
          label="Private event"
          description='Shown to squads as "Busy" even when your squad visibility is PUBLIC.'
          icon={<Lock className="h-4 w-4" aria-hidden="true" />}
          disabled={isSubmitting}
        />
      </div>

      {/* Inline "Apply changes to" section when editing an existing recurring event */}
      {isEditing && isRecurringEvent && (
        <div className="space-y-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5">
          <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-200">
            <Layers className="h-4 w-4 text-indigo-400" aria-hidden="true" />
            <span>Apply changes to</span>
          </div>

          <div
            role="radiogroup"
            aria-label="Apply changes to"
            className="grid gap-2 sm:grid-cols-2"
          >
            {inlineScopeOptions.map((opt) => {
              const isSelected = scopeChoice === opt.id;
              return (
                <label
                  key={opt.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors select-none',
                    isSelected
                      ? 'border-indigo-500/60 bg-indigo-500/15 text-zinc-100'
                      : 'border-dark-border bg-dark-bg/60 text-zinc-300 hover:border-zinc-700',
                    isSubmitting && 'pointer-events-none opacity-60',
                  )}
                >
                  <input
                    type="radio"
                    name="edit-recurrence-scope"
                    value={opt.id}
                    checked={isSelected}
                    disabled={isSubmitting}
                    onChange={() => {
                      setFormError(null);
                      setScopeChoice(opt.id);
                    }}
                    className="mt-0.5 h-4 w-4 accent-indigo-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-zinc-100">{opt.label}</div>
                    <div className="mt-0.5 text-[11px] text-zinc-400">{opt.description}</div>
                  </div>
                </label>
              );
            })}
          </div>

          {scopeChoice === 'CUSTOM' && (
            <RecurrenceCustomDatePicker
              event={event ?? undefined}
              currentOccurrenceDate={currentOccurrenceDate}
              upcomingOccurrences={upcomingOccurrences}
              selectedDates={selectedCustomDates}
              onChangeSelectedDates={(next) => {
                setFormError(null);
                setSelectedCustomDates(next);
              }}
              variant="indigo"
              disabled={isSubmitting}
            />
          )}
        </div>
      )}

      <div className="sticky bottom-0 z-10 -mx-3.5 -mb-3.5 flex items-center justify-end gap-2.5 border-t border-dark-border bg-dark-surface/95 px-4 py-3 backdrop-blur-md sm:-mx-5 sm:-mb-5 sm:px-5 sm:py-3.5">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingText="Saving..."
          disabled={
            isEditing &&
            isRecurringEvent &&
            scopeChoice === 'CUSTOM' &&
            selectedCustomDates.length === 0
          }
        >
          {isEditing ? 'Save changes' : 'Create event'}
        </Button>
      </div>
    </form>
  );
}

export function EventFormModal({
  isOpen,
  onClose,
  event,
  duplicateFromEvent,
  initialSlot,
  categories,
  onSubmitPayload,
  onSubmitScopePayload,
}: EventFormModalProps) {
  const isEditing = Boolean(event);
  const isDuplicating = !isEditing && Boolean(duplicateFromEvent);
  const isRecurringEvent = Boolean(
    event?.recurrenceType && event.recurrenceType !== 'NONE',
  );
  const formKey = event
    ? `edit-${event.occurrenceId || event.eventId}`
    : duplicateFromEvent
      ? `dup-${duplicateFromEvent.occurrenceId || duplicateFromEvent.eventId}`
      : initialSlot
        ? `slot-${initialSlot.start.getTime()}-${initialSlot.end.getTime()}`
        : 'new';

  const modalTitle = isEditing
    ? 'Edit event'
    : isDuplicating
      ? 'Duplicate event'
      : 'New event';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth={isEditing && isRecurringEvent ? 'xl' : 'lg'}
    >
      {isOpen && (
        <EventFormBody
          key={formKey}
          onClose={onClose}
          event={event}
          duplicateFromEvent={duplicateFromEvent}
          initialSlot={initialSlot}
          categories={categories}
          onSubmitPayload={onSubmitPayload}
          onSubmitScopePayload={onSubmitScopePayload}
        />
      )}
    </Modal>
  );
}

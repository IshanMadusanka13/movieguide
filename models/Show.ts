import { Schema, model, models, Document } from 'mongoose';

interface IEpisode {
  episode_number: number;
  name: string;
  overview: string;
  runtime: number;
}

interface ISeason {
  season_number: number;
  name: string;
  overview: string;
  episode_count: number;
  air_date: string;
  episodes: IEpisode[];
}

export interface IShow extends Document {
  id: number;
  name: string;
  overview: string;
  genres: string[];
  number_of_episodes: number;
  number_of_seasons: number;
  poster_path: string;
  seasons: ISeason[];
  status: string;
  tagline: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const showSchema = new Schema<IShow>({
  id: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
  },
  overview: {
    type: String,
    required: true
  },
  genres: {
    type: [String],
    default: []
  },
  number_of_episodes: {
    type: Number,
    required: true
  },
  number_of_seasons: {
    type: Number,
    required: true
  },
  poster_path: {
    type: String,
    required: true
  },
  seasons: [{
    season_number: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    episode_count: {
      type: Number,
      required: true
    },
    episodes: [{
      episode_number: {
        type: Number,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      runtime: {
        type: Number,
        required: true
      }
    }]
  }],
  status: {
    type: String,
    required: true
  },
}, {
  timestamps: true
});

const Show = models.Show || model<IShow>('Show', showSchema, 'shows');

export default Show;
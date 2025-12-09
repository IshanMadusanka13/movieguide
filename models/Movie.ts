import { Schema, model, models, Document } from 'mongoose';

export interface IMovie extends Document {
  id: number;
  title: string;
  overview: string;
  genres: string[];
  release_date: string;
  poster_path: string;
  runtime: number;
  status: string;
  tagline: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const movieSchema = new Schema<IMovie>({
  id: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  title: {
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
  release_date: {
    type: String,
    required: true
  },
  poster_path: {
    type: String,
    required: true
  },
  runtime: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

const Movie = models.Movie || model<IMovie>('Movie', movieSchema, 'movies');

export default Movie;
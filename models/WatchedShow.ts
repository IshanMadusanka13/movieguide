import { Schema, model, models, Document } from 'mongoose';

interface IWatchedEpisode {
  episode_number: number;
  watched_at?: Date;
}

interface IWatchedSeason {
  season_number: number;
  episodes: IWatchedEpisode[];
}

export interface IWatchedShow extends Document {
  user_id: string;
  id: number;
  seasons: IWatchedSeason[];
  createdAt?: Date;
  updatedAt?: Date;
}

const watchedShowSchema = new Schema<IWatchedShow>({
  user_id: {
    type: String,
    required: true,
    index: true
  },
  id: {
    type: Number,
    required: true,
    index: true
  },
  seasons: [{
    season_number: {
      type: Number,
      required: true
    },
    episodes: [{
      episode_number: {
        type: Number,
        required: true
      },
      watched_at: {
        type: Date
      }
    }]
  }]
}, {
  timestamps: true
});

watchedShowSchema.index({ user_id: 1, show_id: 1 }, { unique: true });

const WatchedShow = models.WatchedShow || model<IWatchedShow>('WatchedShow', watchedShowSchema, 'watched_shows');

export default WatchedShow;
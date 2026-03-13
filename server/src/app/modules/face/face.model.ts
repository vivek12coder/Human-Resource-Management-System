import mongoose, { Document, Schema } from "mongoose";

export interface IFaceDescriptor extends Document {
  employee: mongoose.Types.ObjectId;
  descriptorVector: number[];
  createdAt: Date;
  updatedAt: Date;
}

const faceDescriptorSchema = new Schema<IFaceDescriptor>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee reference is required"],
    },
    descriptorVector: {
      type: [Number],
      required: [true, "Face descriptor vector is required"],
    },
  },
  {
    timestamps: true,
  }
);

faceDescriptorSchema.index({ employee: 1 });

const FaceDescriptor = mongoose.model<IFaceDescriptor>("FaceDescriptor", faceDescriptorSchema);

export default FaceDescriptor;

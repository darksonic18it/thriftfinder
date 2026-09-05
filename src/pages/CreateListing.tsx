import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Image as ImageIcon,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import './CreateListing.css';

type ListingCategory =
  | 'Clothing'
  | 'Shoes'
  | 'Accessories'
  | 'Electronics'
  | 'Collectibles'
  | 'Bags'
  | 'Vintage'
  | 'Furniture'
  | 'Books'
  | 'Sports'
  | 'Others';

type ListingCondition = 'Like New' | 'Excellent' | 'Good' | 'Fair';

type PhotoItem = {
  id: string;
  url: string;
  file: File;
};

type ListingFormErrors = Partial<Record<'title' | 'description' | 'category' | 'condition' | 'price' | 'city', string>>;

const CATEGORY_OPTIONS: ListingCategory[] = [
  'Clothing',
  'Shoes',
  'Accessories',
  'Electronics',
  'Collectibles',
  'Bags',
  'Vintage',
  'Furniture',
  'Books',
  'Sports',
  'Others',
];

const CONDITION_OPTIONS: ListingCondition[] = ['Like New', 'Excellent', 'Good', 'Fair'];

const CONDITION_CLASS: Record<ListingCondition, string> = {
  'Like New': 'condition-like-new',
  Excellent: 'condition-excellent',
  Good: 'condition-good',
  Fair: 'condition-fair',
};

const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

function formatPeso(value: number) {
  return value.toLocaleString('en-PH');
}

const ListingPreviewCard: React.FC<{
  imageUrl?: string;
  title?: string;
  description?: string;
  price?: number;
  condition?: ListingCondition;
  category?: ListingCategory;
  city?: string;
  barangay?: string;
}> = ({
  imageUrl,
  title,
  description,
  price,
  condition,
  category,
  city,
  barangay,
}) => {
  const locationText = [city, barangay].filter(Boolean).join(', ');

  return (
    <div className="create-listing-preview-card" aria-label="Listing preview">
      <div className="create-listing-preview-image">
        {imageUrl ? (
          <img src={imageUrl} alt="Listing preview" />
        ) : (
          <div className="create-listing-preview-placeholder">
            <ImageIcon size={36} />
            <span>Add a photo to see a full preview</span>
          </div>
        )}
      </div>

      <div className="create-listing-preview-body">
        <div className="create-listing-preview-meta">
          {condition ? (
            <span className={`condition-pill ${CONDITION_CLASS[condition]}`}>{condition}</span>
          ) : (
            <span className="condition-pill condition-fair">Condition</span>
          )}
        </div>

        <h3 className="create-listing-preview-title">{title?.trim() ? title : 'Your item title'}</h3>

        <div className="create-listing-preview-price">
          {typeof price === 'number' && Number.isFinite(price) ? `₱${formatPeso(price)}` : '₱—'}
        </div>

        <div className="create-listing-preview-badges">
          {category ? <span className="preview-pill">{category}</span> : <span className="preview-pill">Category</span>}
          {locationText ? (
            <span className="preview-pill preview-pill-location">
              <MapPin size={14} />
              {locationText}
            </span>
          ) : (
            <span className="preview-pill preview-pill-location">
              <MapPin size={14} />
              Location
            </span>
          )}
        </div>

        <div className="create-listing-preview-description">
          {description?.trim() ? description : 'Describe your item so buyers know what to expect.'}
        </div>
      </div>
    </div>
  );
};

const CreateListing: React.FC = () => {
  const navigate = useNavigate();

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const photosRef = useRef<PhotoItem[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ListingCategory | ''>('');
  const [condition, setCondition] = useState<ListingCondition | ''>('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [barangay, setBarangay] = useState('');

  const [errors, setErrors] = useState<ListingFormErrors>({});

  const [publishOpen, setPublishOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const draftTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    };
  }, []);

  const priceNumber = useMemo(() => {
    const n = Number(price);
    if (!price.trim() || !Number.isFinite(n)) return undefined;
    return n;
  }, [price]);

  const mainPhotoUrl = photos[0]?.url;

  const getFieldProps = (field: keyof ListingFormErrors) => {
    const error = errors[field];
    return {
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? `${field}-error` : undefined,
    } as const;
  };

  const validate = (): ListingFormErrors => {
    const next: ListingFormErrors = {};

    if (!title.trim()) next.title = 'Please enter an item title.';
    if (!description.trim()) next.description = 'Please enter a description.';
    if (!category) next.category = 'Please choose a category.';
    if (!condition) next.condition = "Please select the item's condition.";

    const n = Number(price);
    if (!price.trim() || !Number.isFinite(n) || n <= 0) next.price = 'Please enter a price.';

    if (!city.trim()) next.city = 'Please enter your location.';

    return next;
  };

  const handleAddPhotos = (files: FileList | null) => {
    if (!files) return;
    const remainingSlots = Math.max(0, 6 - photos.length);
    if (remainingSlots === 0) return;

    const nextFiles = Array.from(files).slice(0, remainingSlots);
    const nextPhotos: PhotoItem[] = nextFiles.map((file) => ({
      id: uid(),
      file,
      url: URL.createObjectURL(file),
    }));

    setPhotos((prev) => [...prev, ...nextPhotos]);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleMakeMainPhoto = (id: string) => {
    setPhotos((prev) => {
      const index = prev.findIndex((p) => p.id === id);
      if (index <= 0) return prev;
      const copy = [...prev];
      const [picked] = copy.splice(index, 1);
      copy.unshift(picked);
      return copy;
    });
  };

  const handlePublish = () => {
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setPublishOpen(true);
  };

  const handleSaveDraft = () => {
    setDraftMessage('Draft saved');
    if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    draftTimerRef.current = window.setTimeout(() => setDraftMessage(null), 2000);
  };

  const listingTitle = title.trim() ? title.trim() : undefined;
  const listingDescription = description.trim() ? description.trim() : undefined;

  return (
    <div className="create-listing-page">
      <div className="create-listing-topbar">
        <Link to="/browse" className="create-listing-back-link">
          <ArrowLeft size={18} />
          <span>Back to Browse</span>
        </Link>
      </div>

      <div className="create-listing-content">
        {/* Form Panel */}
        <div className="create-listing-form-panel">
          <div className="create-listing-header">
            <h1>Create a Listing</h1>
            <p>Sell something you no longer need and give it a second life locally.</p>
          </div>

          {/* Photos */}
          <div className="create-listing-section">
            <h2 className="section-heading">Photos</h2>
            <p className="section-subhelp">Add up to 6 photos</p>
            <p className="section-help">Your first photo will be used as the main listing image.</p>

            <div className="create-listing-photo-block">
              <div className="create-listing-photo-main">
                {mainPhotoUrl ? (
                  <img src={mainPhotoUrl} alt="Main listing photo" />
                ) : (
                  <div className="create-listing-photo-placeholder">
                    <ImageIcon size={40} />
                    <span>No photos yet</span>
                  </div>
                )}

                {mainPhotoUrl ? <span className="main-photo-badge">Main</span> : null}
              </div>

              <div className="create-listing-photo-actions">
                <label className="add-photos-button" aria-label="Add photos">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleAddPhotos(e.target.files)}
                  />
                  <span className="add-photos-button-inner">
                    <Plus size={18} />
                    <span>+ Add Photos</span>
                  </span>
                </label>

                <div className="photo-count">{photos.length}/6 selected</div>
              </div>

              {photos.length > 0 && (
                <div className="photo-thumbnails" aria-label="Photo thumbnails">
                  {photos.map((p, index) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`photo-thumb ${index === 0 ? 'active' : ''}`}
                      onClick={() => handleMakeMainPhoto(p.id)}
                      aria-label={index === 0 ? 'Main photo' : 'Make this the main photo'}
                    >
                      <img src={p.url} alt={`Photo ${index + 1}`} loading="lazy" />

                      {index === 0 ? <span className="photo-thumb-main">Main</span> : null}

                      <span
                        className="photo-remove"
                        role="button"
                        tabIndex={-1}
                        aria-hidden="true"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemovePhoto(p.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Item Details */}
          <div className="create-listing-section">
            <h2 className="section-heading">Item Details</h2>

            <div className="form-field">
              <Label htmlFor="title">Item Title</Label>
              <Input
                id="title"
                placeholder="What are you selling?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                {...getFieldProps('title')}
              />
              {errors.title ? (
                <div className="form-error" id="title-error" role="alert">
                  {errors.title}
                </div>
              ) : null}
            </div>

            <div className="form-field">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Tell buyers about the item, its condition, and anything they should know."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                {...getFieldProps('description')}
                className="create-listing-textarea"
              />
              {errors.description ? (
                <div className="form-error" id="description-error" role="alert">
                  {errors.description}
                </div>
              ) : null}
            </div>

            <div className="form-row">
              <div className="form-field">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ListingCategory | '')}
                  className="create-listing-select"
                  {...getFieldProps('category')}
                >
                  <option value="">Choose a category</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.category ? (
                  <div className="form-error" id="category-error" role="alert">
                    {errors.category}
                  </div>
                ) : null}
              </div>

              <div className="form-field">
                <Label htmlFor="condition">Condition</Label>
                <select
                  id="condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as ListingCondition | '')}
                  className="create-listing-select"
                  {...getFieldProps('condition')}
                >
                  <option value="">Select condition</option>
                  {CONDITION_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.condition ? (
                  <div className="form-error" id="condition-error" role="alert">
                    {errors.condition}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Price & Condition */}
          <div className="create-listing-section">
            <h2 className="section-heading">Price & Condition</h2>
            <p className="section-subhelp">Set a fair price based on the item\'s condition.</p>

            <div className="form-field">
              <Label htmlFor="price">Price</Label>
              <div className="price-input">
                <span className="price-prefix">₱</span>
                <Input
                  id="price"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="price-input-input"
                  {...getFieldProps('price')}
                />
              </div>
              {errors.price ? (
                <div className="form-error" id="price-error" role="alert">
                  {errors.price}
                </div>
              ) : null}
            </div>
          </div>

          {/* Location */}
          <div className="create-listing-section">
            <h2 className="section-heading">Location</h2>
            <p className="section-help">Your location helps nearby buyers find your listing.</p>

            <div className="form-field">
              <Label htmlFor="city">City / Municipality</Label>
              <Input
                id="city"
                placeholder="e.g. Davao City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                {...getFieldProps('city')}
              />
              {errors.city ? (
                <div className="form-error" id="city-error" role="alert">
                  {errors.city}
                </div>
              ) : null}
            </div>

            <div className="form-field">
              <Label htmlFor="barangay">Barangay / Neighborhood (optional)</Label>
              <Input
                id="barangay"
                placeholder="e.g. Barangay 123"
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
              />
            </div>
          </div>

          {/* Publish */}
          <div className="create-listing-section create-listing-actions">
            {draftMessage ? <div className="draft-message">{draftMessage}</div> : null}

            <div className="action-buttons">
              <Button type="button" variant="secondary" onClick={handleSaveDraft}>
                Save Draft
              </Button>
              <Button type="button" onClick={handlePublish} className="publish-btn">
                Publish Listing
              </Button>
            </div>

            {/* Mobile-friendly preview */}
            <div className="preview-mobile">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewDialogOpen(true)}
              >
                Preview Listing
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="create-listing-preview-panel">
          <div className="preview-heading">
            <h2>Listing Preview</h2>
            <p>Here\'s how buyers will see your post.</p>
          </div>

          <ListingPreviewCard
            imageUrl={mainPhotoUrl}
            title={listingTitle}
            description={listingDescription}
            price={priceNumber}
            condition={condition || undefined}
            category={category || undefined}
            city={city || undefined}
            barangay={barangay || undefined}
          />
        </div>
      </div>

      {/* Publish Success Dialog */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="publish-success-icon">
              <CheckCircle2 size={44} />
            </div>
            <DialogTitle>Listing Published!</DialogTitle>
            <DialogDescription>
              Your item is ready to be discovered by nearby buyers.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPublishOpen(false);
                setPreviewDialogOpen(true);
              }}
            >
              View Listing
            </Button>
            <Button
              type="button"
              onClick={() => {
                setPublishOpen(false);
                navigate('/browse');
              }}
            >
              Back to Browse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog (mobile / from success) */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="preview-dialog-content">
          <DialogHeader>
            <DialogTitle>Preview Listing</DialogTitle>
            <DialogDescription>
              This is a frontend-only preview of your listing.
            </DialogDescription>
          </DialogHeader>

          <div className="preview-dialog-body">
            <ListingPreviewCard
              imageUrl={mainPhotoUrl}
              title={listingTitle}
              description={listingDescription}
              price={priceNumber}
              condition={condition || undefined}
              category={category || undefined}
              city={city || undefined}
              barangay={barangay || undefined}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateListing;

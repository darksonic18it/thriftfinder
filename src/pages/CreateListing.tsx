import { supabase } from '../lib/supabaseClient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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
import { listingService } from '../services/listingService';
import { listingImageUrl } from '../lib/listingMappers';
import {
  LISTING_CATEGORIES,
  LISTING_CONDITIONS,
  type ListingCategory,
  type ListingCondition,
} from '../types/database';
import './CreateListing.css';

/**
 * One entry in the photo strip.
 *  - kind 'new'      : a File the user just picked, not uploaded yet
 *  - kind 'existing' : a listing_images row already in the database (edit mode)
 *
 * There is deliberately NO maximum. No MAX_IMAGES constant, no slice(0, n),
 * no "remaining slots" arithmetic. The user may add as many photos as their
 * device and the Storage bucket allow.
 */
type PhotoItem =
  | { key: string; kind: 'new'; url: string; file: File }
  | { key: string; kind: 'existing'; url: string; imageId: string };

type ListingFormErrors = Partial<
  Record<'title' | 'description' | 'category' | 'condition' | 'price' | 'city' | 'photos', string>
>;

const CATEGORY_OPTIONS: ListingCategory[] = LISTING_CATEGORIES;
const CONDITION_OPTIONS: ListingCondition[] = LISTING_CONDITIONS;

const CONDITION_CLASS: Record<ListingCondition, string> = {
  'Like New': 'condition-like-new',
  Excellent: 'condition-excellent',
  Good: 'condition-good',
  Fair: 'condition-fair',
};

const DRAFT_STORAGE_KEY = 'thriftfinder:listing-draft';

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

  // When the route is /edit-listing/:id we run the same form in edit mode.
  const { id: routeListingId } = useParams<{ id: string }>();
  const isEditMode = !!routeListingId;

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);

  const photosRef = useRef<PhotoItem[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => {
        if (p.kind === 'new') URL.revokeObjectURL(p.url);
      });
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [loadingListing, setLoadingListing] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedListingId, setSavedListingId] = useState<string | null>(null);

  const [publishOpen, setPublishOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const draftTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    };
  }, []);

  // ---------------------------------------------------------------
  // Edit mode: load the existing listing + its photos
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!routeListingId) return;
    let active = true;

    (async () => {
      setLoadingListing(true);
      const { data, error } = await listingService.getForEdit(routeListingId);
      if (!active) return;

      if (error || !data) {
        setLoadError(error?.message ?? 'Could not load this listing.');
        setLoadingListing(false);
        return;
      }

      setTitle(data.listing.title);
      setDescription(data.listing.description);
      setCategory(data.listing.category as ListingCategory);
      setCondition(data.listing.condition as ListingCondition);
      setPrice(String(Number(data.listing.price)));
      setCity(data.listing.city);
      setBarangay(data.listing.barangay ?? '');
      setPhotos(
        data.images.map((img) => ({
          key: img.id,
          kind: 'existing' as const,
          imageId: img.id,
          url: listingImageUrl(img.storage_path),
        }))
      );
      setLoadingListing(false);
    })();

    return () => {
      active = false;
    };
  }, [routeListingId]);

  // ---------------------------------------------------------------
  // Create mode: offer the locally saved draft back (text fields only)
  // ---------------------------------------------------------------
  useEffect(() => {
    if (isEditMode) return;
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<Record<string, string>>;
      setTitle(draft.title ?? '');
      setDescription(draft.description ?? '');
      setCategory((draft.category as ListingCategory) ?? '');
      setCondition((draft.condition as ListingCondition) ?? '');
      setPrice(draft.price ?? '');
      setCity(draft.city ?? '');
      setBarangay(draft.barangay ?? '');
    } catch {
      // A corrupt draft is not worth interrupting the user for.
    }
  }, [isEditMode]);

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

    // SRS 4.4: a listing without at least one photo cannot be published.
    if (photos.length === 0) next.photos = 'Add at least one photo.';

    return next;
  };

  /**
   * Accepts every file the user picked. No cap, no slicing, no counting
   * against a maximum.
   */
  const handleAddPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const nextPhotos: PhotoItem[] = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({
        key: uid(),
        kind: 'new' as const,
        file,
        url: URL.createObjectURL(file),
      }));

    if (nextPhotos.length === 0) return;

    setPhotos((prev) => [...prev, ...nextPhotos]);
    setErrors((prev) => ({ ...prev, photos: undefined }));
  };

  const handleRemovePhoto = (key: string) => {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.key === key);
      if (removed?.kind === 'new') URL.revokeObjectURL(removed.url);
      if (removed?.kind === 'existing') {
        setRemovedImageIds((ids) => [...ids, removed.imageId]);
      }
      return prev.filter((p) => p.key !== key);
    });
  };

  const handleMakeMainPhoto = (key: string) => {
    setPhotos((prev) => {
      const index = prev.findIndex((p) => p.key === key);
      if (index <= 0) return prev;
      const copy = [...prev];
      const [picked] = copy.splice(index, 1);
      copy.unshift(picked);
      return copy;
    });
  };

  // ---------------------------------------------------------------
  // Publish / Save
  // ---------------------------------------------------------------
  const handlePublish = useCallback(async () => {
    const { data: sessionCheck, error: sessionErr } = await supabase.auth.getSession();
    console.log('SESSION CHECK', sessionCheck?.session?.user?.id, sessionCheck?.session?.access_token?.slice(0, 20), sessionErr);
    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError(null);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    const commonFields = {
      title: title.trim(),
      description: description.trim(),
      category: category as string,
      condition: condition as string,
      price: Number(price),
      city: city.trim(),
      barangay: barangay.trim(),
    };

    if (isEditMode && routeListingId) {
      const updateResult = await listingService.updateListing(routeListingId, commonFields);
      if (updateResult.error) {
        setSubmitting(false);
        setSubmitError(updateResult.error.message);
        return;
      }

      const imagesResult = await listingService.updateListingImages(routeListingId, {
        keptImageIds: photos
          .filter((p): p is Extract<PhotoItem, { kind: 'existing' }> => p.kind === 'existing')
          .map((p) => p.imageId),
        removedImageIds,
        newPhotos: photos
          .filter((p): p is Extract<PhotoItem, { kind: 'new' }> => p.kind === 'new')
          .map((p) => p.file),
      });

      setSubmitting(false);

      if (imagesResult.error) {
        setSubmitError(imagesResult.error.message);
        return;
      }

      setRemovedImageIds([]);
      setSavedListingId(routeListingId);
      setPublishOpen(true);
      return;
    }

    const result = await listingService.createListing({
      ...commonFields,
      photos: photos
        .filter((p): p is Extract<PhotoItem, { kind: 'new' }> => p.kind === 'new')
        .map((p) => p.file),
    });

    setSubmitting(false);

    if (result.error || !result.data) {
      setSubmitError(result.error?.message ?? 'Could not publish the listing.');
      return;
    }

    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      /* ignore */
    }

    setSavedListingId(result.data.id);
    setPublishOpen(true);
  }, [
    barangay,
    category,
    city,
    condition,
    description,
    isEditMode,
    photos,
    price,
    removedImageIds,
    routeListingId,
    title,
  ]);

  /** Saves the text fields locally so a half-finished form survives a reload. */
  const handleSaveDraft = () => {
    try {
      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ title, description, category, condition, price, city, barangay })
      );
      setDraftMessage('Draft saved on this device (photos are not included)');
    } catch {
      setDraftMessage('Could not save the draft on this device');
    }
    if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    draftTimerRef.current = window.setTimeout(() => setDraftMessage(null), 2500);
  };

  const listingTitle = title.trim() ? title.trim() : undefined;
  const listingDescription = description.trim() ? description.trim() : undefined;

  if (loadingListing) {
    return (
      <div className="create-listing-page">
        <div className="create-listing-topbar">
          <Link to="/dashboard" className="create-listing-back-link">
            <ArrowLeft size={18} />
            <span>Back to Browse</span>
          </Link>
        </div>
        <div className="create-listing-content">
          <div className="create-listing-form-panel">
            <div className="create-listing-header">
              <h1>Loading listing…</h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="create-listing-page">
        <div className="create-listing-topbar">
          <Link to="/dashboard" className="create-listing-back-link">
            <ArrowLeft size={18} />
            <span>Back to Browse</span>
          </Link>
        </div>
        <div className="create-listing-content">
          <div className="create-listing-form-panel">
            <div className="create-listing-header">
              <h1>Can't edit this listing</h1>
              <p>{loadError}</p>
            </div>
            <div className="action-buttons">
              <Button type="button" onClick={() => navigate('/dashboard')}>
                Back to Browse
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-listing-page">
      <div className="create-listing-topbar">
        <Link to="/dashboard" className="create-listing-back-link">
          <ArrowLeft size={18} />
          <span>Back to Browse</span>
        </Link>
      </div>

      <div className="create-listing-content">
        {/* Form Panel */}
        <div className="create-listing-form-panel">
          <div className="create-listing-header">
            <h1>{isEditMode ? 'Edit Listing' : 'Create a Listing'}</h1>
            <p>
              {isEditMode
                ? 'Update your item details and photos.'
                : 'Sell something you no longer need and give it a second life locally.'}
            </p>
          </div>

          {/* Photos */}
          <div className="create-listing-section">
            <h2 className="section-heading">Photos</h2>
            <p className="section-subhelp">Add as many photos as you like</p>
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
                    onChange={(e) => {
                      handleAddPhotos(e.target.files);
                      // allow picking the same file again after removing it
                      e.target.value = '';
                    }}
                  />
                  <span className="add-photos-button-inner">
                    <Plus size={18} />
                    <span>+ Add Photos</span>
                  </span>
                </label>

                <div className="photo-count">
                  {photos.length} {photos.length === 1 ? 'photo' : 'photos'} selected
                </div>
              </div>

              {photos.length > 0 && (
                <div className="photo-thumbnails" aria-label="Photo thumbnails">
                  {photos.map((p, index) => (
                    <button
                      key={p.key}
                      type="button"
                      className={`photo-thumb ${index === 0 ? 'active' : ''}`}
                      onClick={() => handleMakeMainPhoto(p.key)}
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
                          handleRemovePhoto(p.key);
                        }}
                      >
                        <Trash2 size={16} />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {errors.photos ? (
                <div className="form-error" id="photos-error" role="alert">
                  {errors.photos}
                </div>
              ) : null}
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
            <h2 className="section-heading">Price &amp; Condition</h2>
            <p className="section-subhelp">Set a fair price based on the item's condition.</p>

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

            {submitError ? (
              <div className="form-error" role="alert">
                {submitError}
              </div>
            ) : null}

            <div className="action-buttons">
              {!isEditMode ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                >
                  Save Draft
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(`/listing/${routeListingId}`)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              )}

              <Button
                type="button"
                onClick={handlePublish}
                className="publish-btn"
                disabled={submitting}
              >
                {submitting
                  ? isEditMode
                    ? 'Saving…'
                    : 'Publishing…'
                  : isEditMode
                    ? 'Save Changes'
                    : 'Publish Listing'}
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
            <p>Here's how buyers will see your post.</p>
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
            <DialogTitle>{isEditMode ? 'Listing Updated!' : 'Listing Published!'}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Your changes are live for buyers to see.'
                : 'Your item is ready to be discovered by nearby buyers.'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPublishOpen(false);
                if (savedListingId) navigate(`/listing/${savedListingId}`);
              }}
            >
              View Listing
            </Button>
            <Button
              type="button"
              onClick={() => {
                setPublishOpen(false);
                navigate('/dashboard');
              }}
            >
              Back to Browse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog (mobile) */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="preview-dialog-content">
          <DialogHeader>
            <DialogTitle>Preview Listing</DialogTitle>
            <DialogDescription>
              This is how your listing will appear to buyers.
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
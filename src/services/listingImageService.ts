import { supabase } from '../lib/supabaseClient'
import {
  buildListingImagePath,
  describeError,
} from '../lib/listingMappers'
import {
  LISTING_PHOTOS_BUCKET,
  type ListingImage,
  type ServiceResult,
  type UUID,
} from '../types/database'

const REORDER_OFFSET = 1_000_000

export interface UploadedImage {
  storage_path: string
  sort_order: number
}

export const listingImageService = {
  async listByListing(listingId: UUID): Promise<ServiceResult<ListingImage[]>> {
    const { data, error } = await supabase
      .from('listing_images')
      .select('id, listing_id, storage_path, sort_order, created_at')
      .eq('listing_id', listingId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[listingImageService.listByListing]', error)
      return { data: null, error: describeError(error, 'Could not load photos.') }
    }
    return { data: (data ?? []) as ListingImage[], error: null }
  },

  async uploadFiles(
    sellerId: UUID,
    listingId: UUID,
    files: File[],
    startSortOrder = 0
  ): Promise<ServiceResult<UploadedImage[]>> {
    const uploaded: UploadedImage[] = []

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]
      const sortOrder = startSortOrder + i
      const path = buildListingImagePath(sellerId, listingId, sortOrder, file.name)

      const { error } = await supabase.storage
        .from(LISTING_PHOTOS_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        })

      if (error) {
        console.error('[listingImageService.uploadFiles]', file.name, error)
        await listingImageService.removeObjects(uploaded.map((u) => u.storage_path))
        return {
          data: null,
          error: describeError(
            error,
            `Upload failed on photo ${i + 1} of ${files.length}. No photos were saved.`
          ),
        }
      }

      uploaded.push({ storage_path: path, sort_order: sortOrder })
    }

    return { data: uploaded, error: null }
  },

  async insertRows(
    listingId: UUID,
    images: UploadedImage[]
  ): Promise<ServiceResult<ListingImage[]>> {
    if (images.length === 0) return { data: [], error: null }

    const { data, error } = await supabase
      .from('listing_images')
      .insert(
        images.map((img) => ({
          listing_id: listingId,
          storage_path: img.storage_path,
          sort_order: img.sort_order,
        }))
      )
      .select('id, listing_id, storage_path, sort_order, created_at')

    if (error) {
      console.error('[listingImageService.insertRows]', error)
      return { data: null, error: describeError(error, 'Could not save photos.') }
    }
    return { data: (data ?? []) as ListingImage[], error: null }
  },

  async removeObjects(paths: string[]): Promise<void> {
    if (paths.length === 0) return
    const { error } = await supabase.storage.from(LISTING_PHOTOS_BUCKET).remove(paths)
    if (error) {
      console.error('[listingImageService.removeObjects]', error)
    }
  },

  async deleteImages(imageIds: UUID[]): Promise<ServiceResult<true>> {
    if (imageIds.length === 0) return { data: true, error: null }

    const { data: rows, error: readError } = await supabase
      .from('listing_images')
      .select('id, storage_path')
      .in('id', imageIds)

    if (readError) {
      console.error('[listingImageService.deleteImages:read]', readError)
      return { data: null, error: describeError(readError, 'Could not remove photos.') }
    }

    const { error: deleteError } = await supabase
      .from('listing_images')
      .delete()
      .in('id', imageIds)

    if (deleteError) {
      console.error('[listingImageService.deleteImages:delete]', deleteError)
      return { data: null, error: describeError(deleteError, 'Could not remove photos.') }
    }

    await listingImageService.removeObjects(
      (rows ?? []).map((r) => (r as { storage_path: string }).storage_path)
    )

    return { data: true, error: null }
  },

  async reorder(
    listingId: UUID,
    orderedImageIds: UUID[]
  ): Promise<ServiceResult<true>> {
    for (let i = 0; i < orderedImageIds.length; i += 1) {
      const { error } = await supabase
        .from('listing_images')
        .update({ sort_order: REORDER_OFFSET + i })
        .eq('id', orderedImageIds[i])
        .eq('listing_id', listingId)

      if (error) {
        console.error('[listingImageService.reorder:pass1]', error)
        return { data: null, error: describeError(error, 'Could not reorder photos.') }
      }
    }

    for (let i = 0; i < orderedImageIds.length; i += 1) {
      const { error } = await supabase
        .from('listing_images')
        .update({ sort_order: i })
        .eq('id', orderedImageIds[i])
        .eq('listing_id', listingId)

      if (error) {
        console.error('[listingImageService.reorder:pass2]', error)
        return { data: null, error: describeError(error, 'Could not reorder photos.') }
      }
    }

    return { data: true, error: null }
  },

  async nextFreeSortOrder(listingId: UUID): Promise<number> {
    const { data, error } = await supabase
      .from('listing_images')
      .select('sort_order')
      .eq('listing_id', listingId)
      .order('sort_order', { ascending: false })
      .limit(1)

    if (error || !data || data.length === 0) return 0
    return ((data[0] as { sort_order: number }).sort_order ?? -1) + 1
  },
}
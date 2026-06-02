'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function ExceptionReportModal({ order, driverId, onSuccess, onClose }) {
  const supabase = createClient();
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [selectedReasonId, setSelectedReasonId] = useState(null);
  const [selectedReasonLabel, setSelectedReasonLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRejectionReasons();
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.warn('Geolocation error:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const loadRejectionReasons = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('rejection_reasons')
        .select('id,label')
        .eq('active', true);

      if (fetchError) throw fetchError;
      setRejectionReasons(data || []);
    } catch (err) {
      console.error('Error loading rejection reasons:', err);
      setError('Error al cargar los motivos de rechazo');
    }
  };

  const compressImage = async (file) => {
    if (file.size <= 2 * 1024 * 1024) return file;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Compression failed'));
              }
            },
            'image/jpeg',
            0.8
          );
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('La foto no puede superar los 10MB');
        return;
      }
      setError(null);
      const compressed = await compressImage(file);
      setPhoto(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    }
  };

  const handleReasonChange = (e) => {
    const selectedId = e.target.value;
    const selected = rejectionReasons.find((r) => r.id.toString() === selectedId);
    if (selected) {
      setSelectedReasonId(selected.id);
      setSelectedReasonLabel(selected.label);
    } else {
      setSelectedReasonId(null);
      setSelectedReasonLabel('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReasonLabel) {
      setError('Selecciona un motivo de excepción');
      return;
    }
    if (!photo) {
      setError('La foto de evidencia es obligatoria');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const attemptNum = (order.intentos_entrega || 0) + 1;
      const fileName = `${order.id}/attempt_${attemptNum}_${Date.now()}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pod-media')
        .upload(fileName, photo, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pod-media')
        .getPublicUrl(fileName);

      const { error: rpcError } = await supabase.rpc('register_delivery_attempt', {
        p_order_id: order.id,
        p_reason: selectedReasonLabel,
        p_driver_id: driverId,
        p_photo_url: publicUrl,
        p_lat: location?.lat || null,
        p_lng: location?.lng || null,
        p_notes: notes || null,
        p_rejection_reason_id: selectedReasonId
      });

      if (rpcError) throw rpcError;

      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Error al reportar la excepción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Reportar entrega fallida</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Por qué no se pudo entregar (obligatorio)
              </label>
              <select
                value={selectedReasonId || ''}
                onChange={handleReasonChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#04f46e5] focus:border-transparent"
                required
              >
                <option value="">Selecciona el motivo</option>
                {rejectionReasons.map((reason) => (
                  <option key={reason.id} value={reason.id}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas adicionales
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 300))}
                maxLength={300}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#04f46e5] focus:border-transparent resize-none"
                placeholder="Describe detalles adicionales..."
              />
              <p className="text-xs text-gray-500 mt-1 text-right">{notes.length}/300</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foto de la evidencia (obligatorio)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-[#04f46e5] transition-colors cursor-pointer">
                {photoPreview ? (
                  <div className="space-y-2 text-center">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="mx-auto h-32 w-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhoto(null);
                        setPhotoPreview(null);
                      }}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Eliminar foto
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer rounded-md font-medium text-[#04f46e5] hover:text-[#04f46e5] focus-within:outline-none">
                        <span>Subir foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG hasta 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-[#04f46e5] text-white rounded-lg hover:bg-[#04f46e5] disabled:opacity-50 transition-colors font-medium"
              >
                {loading ? 'Enviando...' : 'Reportar Excepción'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

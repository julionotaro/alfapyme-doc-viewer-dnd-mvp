import { supabase } from '../lib/supabase'
const BUCKET='case-documents'

export async function fetchCases(){const{data,error}=await supabase.from('cases').select('*').order('created_at',{ascending:false});if(error)throw error;return data||[]}
export async function fetchDocuments(caseId){const{data,error}=await supabase.from('documents').select('*').eq('case_id',caseId).order('created_at',{ascending:false});if(error)throw error;return data||[]}
export async function fetchChecklist(caseId){const{data,error}=await supabase.from('case_document_checklist').select('*').eq('case_id',caseId).order('document_label');if(error)throw error;return data||[]}
export async function updateChecklist(id,payload){const{data,error}=await supabase.from('case_document_checklist').update({...payload,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;return data}
export async function updateCaseStatus(caseId,status){const{data,error}=await supabase.from('cases').update({status,updated_at:new Date().toISOString()}).eq('id',caseId).select().single();if(error)throw error;return data}

export async function getDocumentSignedUrl(doc){
  if(!doc?.storage_path)return null
  const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path,3600)
  if(error)throw error
  return data?.signedUrl
}

export async function uploadDocument({caseId,organizationId,file}){
  const name=file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
  const path=`${caseId}/${Date.now()}-${name}`
  const up=await supabase.storage.from(BUCKET).upload(path,file,{upsert:false})
  if(up.error)throw up.error
  const docType=detectDocType(file.name)
  const conf=docType==='documento_trafico'?0.72:0.88
  const {data,error}=await supabase.from('documents').insert({
    case_id:caseId,organization_id:organizationId,file_name:file.name,file_type:file.type||'application/octet-stream',
    source_channel:'manual',storage_path:path,status:'ai_extracted',document_type:docType,confidence:conf,
    ocr_text:`OCR simulado para ${file.name}`,ai_payload:{engine:'tyrion_simulado',document_type:docType,confidence:conf,warnings: conf<0.85?['Clasificación de baja confianza. Requiere revisión.']:[]}
  }).select().single()
  if(error)throw error
  await supabase.rpc('sync_document_to_checklist',{p_document_id:data.id})
  return data
}
function detectDocType(n=''){
  n=n.toLowerCase()
  if(n.includes('dni')&&n.includes('compr'))return'dni_comprador'
  if(n.includes('dni')&&n.includes('vend'))return'dni_vendedor'
  if(n.includes('permiso'))return'permiso_circulacion'
  if(n.includes('ficha'))return'ficha_tecnica'
  if(n.includes('factura')||n.includes('contrato'))return'contrato_factura'
  if(n.includes('pago')||n.includes('tasa')||n.includes('justificante'))return'justificante_pago'
  if(n.includes('mandato')||n.includes('autorizacion'))return'mandato_gestoria'
  if(n.includes('solicitud')&&n.includes('baja'))return'solicitud_baja'
  if(n.includes('duplicado'))return'solicitud_duplicado'
  return'documento_trafico'
}

export async function fetchOutputQueue(){const{data,error}=await supabase.from('output_queue').select('*, cases(public_id, client_name, vehicle_plate, status)').order('created_at',{ascending:false});if(error)throw error;return data||[]}
export async function fetchOutputBatches(){const{data,error}=await supabase.from('output_batches').select('*').order('created_at',{ascending:false});if(error)throw error;return data||[]}
export async function fetchOutputSessions(){const{data,error}=await supabase.from('output_sessions').select('*').order('created_at',{ascending:false});if(error)throw error;return data||[]}
export async function fetchOutputJobs(){const{data,error}=await supabase.from('output_jobs').select('*').order('created_at',{ascending:false});if(error)throw error;return data||[]}
export async function fetchOutputStrategies(){const{data,error}=await supabase.from('output_strategies').select('*').order('case_type');if(error)throw error;return data||[]}
export async function processOutputQueue(){const{data,error}=await supabase.rpc('process_output_queue');if(error)throw error;return data}

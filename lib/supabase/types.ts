/**
 * Supabase Database Types
 * 
 * Auto-generated from the database schema.
 * To regenerate, run:
 *   npx supabase gen types typescript --project-id kpafjhkrjipiyfjizyaw > lib/supabase/types.ts
 * 
 * This file provides a placeholder type definition that matches
 * the schema in supabase/migrations/20260221000000_initial_schema.sql.
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            books: {
                Row: {
                    id: string
                    title: string
                    author: string
                    illustrator: string | null
                    description: string | null
                    genre: string | null
                    cover_image_url: string | null
                    series_name: string | null
                    series_order: number | null
                    status: 'draft' | 'published'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    author: string
                    illustrator?: string | null
                    description?: string | null
                    genre?: string | null
                    cover_image_url?: string | null
                    series_name?: string | null
                    series_order?: number | null
                    status?: 'draft' | 'published'
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    author?: string
                    illustrator?: string | null
                    description?: string | null
                    genre?: string | null
                    cover_image_url?: string | null
                    series_name?: string | null
                    series_order?: number | null
                    status?: 'draft' | 'published'
                    created_at?: string
                    updated_at?: string
                }
            }
            book_variants: {
                Row: {
                    id: string
                    book_id: string
                    format: 'ebook' | 'paper_book' | 'komet_card'
                    price: number
                    is_in_stock: boolean
                    stock_count: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    book_id: string
                    format: 'ebook' | 'paper_book' | 'komet_card'
                    price: number
                    is_in_stock?: boolean
                    stock_count?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    book_id?: string
                    format?: 'ebook' | 'paper_book' | 'komet_card'
                    price?: number
                    is_in_stock?: boolean
                    stock_count?: number | null
                    created_at?: string
                }
            }
            book_pages: {
                Row: {
                    id: string
                    book_id: string
                    page_number: number
                    page_image_url: string
                    content: string | null
                    word_count: number
                }
                Insert: {
                    id?: string
                    book_id: string
                    page_number: number
                    page_image_url: string
                    content?: string | null
                    word_count?: number
                }
                Update: {
                    id?: string
                    book_id?: string
                    page_number?: number
                    page_image_url?: string
                    content?: string | null
                    word_count?: number
                }
            }
            book_illustrations: {
                Row: {
                    id: string
                    book_id: string
                    image_url: string
                    page_number: number
                    position_index: number
                    caption: string | null
                    width: number | null
                    height: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    book_id: string
                    image_url: string
                    page_number: number
                    position_index?: number
                    caption?: string | null
                    width?: number | null
                    height?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    book_id?: string
                    image_url?: string
                    page_number?: number
                    position_index?: number
                    caption?: string | null
                    width?: number | null
                    height?: number | null
                    created_at?: string
                }
            }
            users: {
                Row: {
                    id: string
                    email: string
                    first_name: string | null
                    last_name: string | null
                    display_name: string | null
                    avatar_url: string | null
                    bio: string | null
                    role: 'reader' | 'admin'
                    tshirt_size: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    first_name?: string | null
                    last_name?: string | null
                    display_name?: string | null
                    avatar_url?: string | null
                    bio?: string | null
                    role?: 'reader' | 'admin'
                    tshirt_size?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    first_name?: string | null
                    last_name?: string | null
                    display_name?: string | null
                    avatar_url?: string | null
                    bio?: string | null
                    role?: 'reader' | 'admin'
                    tshirt_size?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            reading_progress: {
                Row: {
                    id: string
                    user_id: string
                    book_id: string
                    current_page: number
                    progress_percent: number
                    last_read_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    book_id: string
                    current_page?: number
                    progress_percent?: number
                    last_read_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    book_id?: string
                    current_page?: number
                    progress_percent?: number
                    last_read_at?: string
                }
            }
            highlights: {
                Row: {
                    id: string
                    user_id: string
                    book_id: string
                    page_number: number
                    paragraph_index: number
                    text: string
                    color: 'yellow' | 'green' | 'blue' | 'pink'
                    note: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    book_id: string
                    page_number: number
                    paragraph_index: number
                    text: string
                    color?: 'yellow' | 'green' | 'blue' | 'pink'
                    note?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    book_id?: string
                    page_number?: number
                    paragraph_index?: number
                    text?: string
                    color?: 'yellow' | 'green' | 'blue' | 'pink'
                    note?: string | null
                    created_at?: string
                }
            }
            bookmarks: {
                Row: {
                    id: string
                    user_id: string
                    book_id: string
                    page_number: number
                    label: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    book_id: string
                    page_number: number
                    label?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    book_id?: string
                    page_number?: number
                    label?: string | null
                    created_at?: string
                }
            }
            reading_settings: {
                Row: {
                    id: string
                    user_id: string
                    zoom: number
                    theme: 'dark' | 'light' | 'sepia'
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    zoom?: number
                    theme?: 'dark' | 'light' | 'sepia'
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    zoom?: number
                    theme?: 'dark' | 'light' | 'sepia'
                    updated_at?: string
                }
            }
            user_library: {
                Row: {
                    id: string
                    user_id: string
                    book_id: string
                    source: 'purchase' | 'subscription_signup' | 'book_club_monthly'
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    book_id: string
                    source: 'purchase' | 'subscription_signup' | 'book_club_monthly'
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    book_id?: string
                    source?: 'purchase' | 'subscription_signup' | 'book_club_monthly'
                    created_at?: string
                }
            }
            user_subscriptions: {
                Row: {
                    id: string
                    user_id: string
                    plan: 'free' | 'premium'
                    status: 'active' | 'cancelled' | 'expired' | 'past_due'
                    stripe_subscription_id: string | null
                    current_period_end: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    plan?: 'free' | 'premium'
                    status?: 'active' | 'cancelled' | 'expired' | 'past_due'
                    stripe_subscription_id?: string | null
                    current_period_end?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    plan?: 'free' | 'premium'
                    status?: 'active' | 'cancelled' | 'expired' | 'past_due'
                    stripe_subscription_id?: string | null
                    current_period_end?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            cart_items: {
                Row: {
                    id: string
                    session_id: string | null
                    user_id: string | null
                    variant_id: string
                    quantity: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    session_id?: string | null
                    user_id?: string | null
                    variant_id: string
                    quantity?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    session_id?: string | null
                    user_id?: string | null
                    variant_id?: string
                    quantity?: number
                    created_at?: string
                }
            }
            orders: {
                Row: {
                    id: string
                    user_id: string
                    status: 'pending' | 'confirmed' | 'fulfilled'
                    subtotal: number
                    tax: number
                    shipping: number
                    total: number
                    stripe_payment_intent_id: string | null
                    shipping_address: Json | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    status?: 'pending' | 'confirmed' | 'fulfilled'
                    subtotal: number
                    tax: number
                    shipping: number
                    total: number
                    stripe_payment_intent_id?: string | null
                    shipping_address?: Json | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    status?: 'pending' | 'confirmed' | 'fulfilled'
                    subtotal?: number
                    tax?: number
                    shipping?: number
                    total?: number
                    stripe_payment_intent_id?: string | null
                    shipping_address?: Json | null
                    created_at?: string
                    updated_at?: string
                }
            }
            order_items: {
                Row: {
                    id: string
                    order_id: string
                    variant_id: string
                    quantity: number
                    unit_price: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    order_id: string
                    variant_id: string
                    quantity?: number
                    unit_price: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    order_id?: string
                    variant_id?: string
                    quantity?: number
                    unit_price?: number
                    created_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            user_role_enum: 'reader' | 'admin'
            tshirt_size_enum: 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl'
            subscription_plan_enum: 'free' | 'premium'
            subscription_status_enum: 'active' | 'cancelled' | 'expired' | 'past_due'
            genre_enum: 'Crime' | 'Children' | 'PTP' | 'Spiritual' | 'Adult' | 'Sports' | 'Self-Help' | 'Cooking'
            book_status_enum: 'draft' | 'published'
            book_format_enum: 'ebook' | 'paper_book' | 'komet_card'
            order_status_enum: 'pending' | 'confirmed' | 'fulfilled'
            library_source_enum: 'purchase' | 'subscription_signup' | 'book_club_monthly'
            highlight_color_enum: 'yellow' | 'green' | 'blue' | 'pink'
            reading_theme_enum: 'dark' | 'light' | 'sepia'
        }
    }
}